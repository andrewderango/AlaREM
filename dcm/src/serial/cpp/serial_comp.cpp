#include <iostream>
#include <fstream>
#include <string>
#include <thread>
#include <chrono>
#include <vector>
#include <map>
#include <mutex>
#include <condition_variable>
#include <random>
#include <asio.hpp>
#include <asio/serial_port.hpp>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;
using namespace std::chrono_literals;

enum class MsgStatus { FULFILLING, FULFILLED, FAILED };
enum class PMPSerialMsgType { SUCCESS, ERROR };

struct Msg {
    int msg_id;
    int msg_type;
    MsgStatus msg_status;
    std::vector<uint8_t> msg;
};

struct PMPSerialMsg {
    PMPSerialMsgType status;
    std::string msg;
};

struct PMPEgramData {
    std::vector<float> atrialSense;
    std::vector<float> ventricularSense;
};

struct PMParameters {
    int mode;
    int lrl;
    int url;
    int arp;
    int vrp;
    int apw;
    int vpw;
    float aamp;
    float vamp;
    float asens;
    float vsens;
    int av_delay;
    int rate_fac;
    int act_thresh;
    int react_time;
    int recov_time;
};

class PacemakerSerial {
public:
    PacemakerSerial(const std::string& port, unsigned int baud_rate)
        : io(), serial(io, port), read_running(false), poll_running(false), connected(false), connecting(true) {
        serial.set_option(asio::serial_port_base::baud_rate(baud_rate));
    }

    ~PacemakerSerial() {
        close();
    }

    void write(const std::string& s) {
        asio::write(serial, asio::buffer(s.c_str(), s.size()));
    }

    std::string read() {
        char c;
        std::string result;
        for (;;) {
            asio::read(serial, asio::buffer(&c, 1));
            if (c == '\n')
                break;
            result += c;
        }
        return result;
    }

    bool is_connected() {
        return connected;
    }

    bool is_connecting() {
        return connecting;
    }

    void close() {
        read_running = false;
        poll_running = false;
        if (read_thread.joinable()) {
            read_thread.join();
        }
        if (poll_thread.joinable()) {
            poll_thread.join();
        }
        if (serial.is_open()) {
            serial.close();
        }
        connected = false;
        connecting = true;
    }

    void set_pm_id(int id) {
        pm_id = id;
    }

    json search_and_connect(const std::string& mode) {
        if (mode == "init") {
            while (true) {
                auto ports = scan_ports();
                for (const auto& port : ports) {
                    if (serial_connect(port)) {
                        auto res = handshake(port);
                        if (res["status"] == "success") {
                            return res;
                        }
                        close();
                    }
                }
            }
        } else if (mode == "reconnect") {
            auto start = std::chrono::steady_clock::now();
            while (std::chrono::steady_clock::now() - start < std::chrono::seconds(10)) {
                auto ports = scan_ports();
                for (const auto& port : ports) {
                    if (serial_connect(port)) {
                        auto res = handshake(port);
                        if (res["status"] == "success") {
                            return res;
                        }
                        close();
                    }
                }
            }
            return json::object({{"status", "error"}, {"message", "Failed to reconnect"}});
        } else {
            return json::object({{"status", "error"}, {"message", "Invalid mode"}});
        }
    }

    json send_parameters(const json& params) {
        int retry_limit = 5;
        for (int i = 0; i < retry_limit; ++i) {
            if (!connected) {
                return json::object({{"status", "error"}, {"message", "Not connected"}});
            }

            write(params.dump());
            auto response = read();
            auto res = json::parse(response);

            if (res["status"] == "success") {
                return res;
            }

            std::this_thread::sleep_for(500ms);
        }
        return json::object({{"status", "error"}, {"message", "Failed to send parameters"}});
    }

    json toggle_egram(bool use_internal, bool explicit_command) {
        json command;
        if (use_internal) {
            command = json::object({{"type", "toggle_egram"}, {"mode", "internal"}});
        } else if (explicit_command) {
            command = json::object({{"type", "toggle_egram"}, {"mode", "start"}});
        } else {
            command = json::object({{"type", "toggle_egram"}, {"mode", "stop"}});
        }

        write(command.dump());
        auto response = read();
        return json::parse(response);
    }

private:
    asio::io_service io;
    asio::serial_port serial;
    int pm_id;
    bool connected;
    bool connecting;
    bool read_running;
    bool poll_running;
    std::thread read_thread;
    std::thread poll_thread;
    std::mutex egram_lock;
    std::map<int, Msg> msg_log;
    std::map<int, Msg> egram_msg_log;

    std::vector<std::string> scan_ports() {
        std::vector<std::string> ports;
        // Add logic to scan and populate available ports
        return ports;
    }

    bool serial_connect(const std::string& port) {
        try {
            serial.open(port);
            connected = true;
            connecting = false;
            read_running = true;
            poll_running = true;
            read_thread = std::thread(&PacemakerSerial::read_process, this);
            poll_thread = std::thread(&PacemakerSerial::poll_process, this);
            return true;
        } catch (const std::exception& e) {
            spdlog::error("Failed to connect to port {}: {}", port, e.what());
            return false;
        }
    }

    json handshake(const std::string& port) {
        json handshake_msg = {{"type", "handshake"}, {"port", port}};
        write(handshake_msg.dump());
        auto response = read();
        return json::parse(response);
    }

    void read_process() {
        while (read_running) {
            try {
                if (serial.is_open()) {
                    if (serial.available() < 82) {
                        std::this_thread::sleep_for(10ms);
                        continue;
                    }

                    std::vector<uint8_t> res(82);
                    asio::read(serial, asio::buffer(res.data(), res.size()));
                    int msg_id = res[0];
                    int msg_type = res[1];
                    auto msg = std::vector<uint8_t>(res.begin() + 2, res.end());
                    auto timestamp = std::chrono::system_clock::now().time_since_epoch().count();

                    if (msg_type == 0x05) {
                        std::lock_guard<std::mutex> lock(egram_lock);
                        egram_msg_log[timestamp] = {msg_id, msg_type, MsgStatus::FULFILLED, msg};
                        spdlog::debug("[read_process] Egram data received: {}", msg);
                    } else if (msg_log.find(msg_id) != msg_log.end()) {
                        msg_log[msg_id] = {msg_id, msg_type, MsgStatus::FULFILLED, msg};
                        spdlog::debug("[read_process] Message received: {} | {}", msg_id, msg);
                    } else {
                        msg_log[msg_id] = {msg_id, msg_type, MsgStatus::FAILED, msg};
                        spdlog::debug("[read_process] Unknown message received: {} | {}", msg_id, msg);
                    }
                } else {
                    spdlog::debug("[read_process] Waiting for connection...");
                }
            } catch (const std::exception& e) {
                spdlog::debug("[read_process] Critical failure: {}", e.what());
            }

            std::this_thread::sleep_for(10ms);
        }
    }

    void poll_process() {
        spdlog::debug("[poll_process] Polling process started");
        while (poll_running) {
            if (connected) {
                spdlog::debug("[poll_process] Polling for data...");
                int msg_id = create_msg(0x02);
                std::vector<uint8_t> req(82);
                req[0] = msg_id;
                req[1] = 0x02;

                send_raw(req);
                auto res = block_until_fulfilled(msg_id, 0.5);
                int res_msg_id = res.msg_id;
                int res_msg_type = res.msg_type;
                auto res_bytearray = res.msg;

                if (res_bytearray.empty()) {
                    spdlog::debug("[poll_process] Polling failed: No data received");
                    connected = false;
                    connecting = true;
                    continue;
                }

                int res_pm_id = *reinterpret_cast<uint16_t*>(res_bytearray.data());

                if (res_msg_id == msg_id && res_msg_type == 0x02 && res_pm_id == pm_id) {
                    spdlog::debug("[poll_process] Polling success: {}", res_bytearray);
                } else {
                    spdlog::debug("[poll_process] Polling failed: {}", res_bytearray);
                    connected = false;
                    connecting = true;
                }
            } else {
                spdlog::debug("[poll_process] Waiting for connection...");
            }

            std::this_thread::sleep_for(100ms);
        }
    }

    Msg block_until_fulfilled(int msg_id, double timeout) {
        auto start = std::chrono::steady_clock::now();

        while (msg_log[msg_id].msg_status != MsgStatus::FULFILLED) {
            spdlog::debug("[block_until_fulfilled] Waiting for message: {}", msg_id);

            if (std::chrono::steady_clock::now() - start > std::chrono::milliseconds(static_cast<int>(timeout * 1000))) {
                spdlog::debug("[block_until_fulfilled] Timeout exceeded: {}", msg_id);
                msg_log[msg_id] = {msg_id, msg_log[msg_id].msg_type, MsgStatus::FAILED, {}};
                return msg_log[msg_id];
            }

            std::this_thread::sleep_for(100ms);
        }

        spdlog::debug("[block_until_fulfilled] Message fulfilled: {}", msg_id);
        auto msg = msg_log[msg_id];
        msg_log.erase(msg_id);
        return msg;
    }

    int create_msg(int msg_type) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, 255);
        int msg_id = dis(gen);
        while (msg_log.find(msg_id) != msg_log.end()) {
            msg_id = dis(gen);
        }

        if (msg_type != 0x05) {
            msg_log[msg_id] = {msg_id, msg_type, MsgStatus::FULFILLING, {}};
        }
        spdlog::debug("[create_msg] Message created: {}", msg_id);
        return msg_id;
    }

    void send_raw(const std::vector<uint8_t>& payload) {
        if (payload.size() != 82) {
            throw std::invalid_argument("Invalid payload size");
        }
        try {
            asio::write(serial, asio::buffer(payload.data(), payload.size()));
        } catch (const std::exception& e) {
            spdlog::critical("[send_raw] Critical failure: {}", e.what());
        }
        spdlog::debug("[send_raw] Message sent: {}", payload);
    }
};

class WebSocketServer {
public:
    WebSocketServer() : reconnect_fail(false), first_connection(true), global_pm_id(-1) {
        setup_logging();
    }

    void start() {
        std::thread([this]() { this->run(); }).detach();
    }

private:
    void run() {
        while (true) {
            std::this_thread::sleep_for(100ms);
        }
    }

    void reconnect() {
        while (true) {
            if (pm_serial && !pm_serial->is_connected() && pm_serial->is_connecting() && !first_connection && !reconnect_fail) {
                pm_serial->close();
                pm_serial = std::make_unique<PacemakerSerial>("COM_PORT", 112500);
                pm_serial->set_pm_id(global_pm_id);
                auto res = pm_serial->search_and_connect("reconnect");

                if (res["status"] == "success") {
                    spdlog::info("[RECONNECT] Reconnected to pacemaker");
                    // Send success message to websocket
                } else {
                    spdlog::error("[RECONNECT] Failed to reconnect to pacemaker");
                    reconnect_fail = true;
                    pm_serial->close();
                    pm_serial.reset();
                    first_connection = true;
                    // Send failure message to websocket
                }
            }
            std::this_thread::sleep_for(100ms);
        }
    }

    void handle_message(const std::string& message) {
        auto data = json::parse(message);
        if (data["type"] == "initialize") {
            if (first_connection) {
                int pm_id = data.value("pm_id", -1);
                global_pm_id = pm_id;

                if (pm_id == -1) {
                    spdlog::error("[MAIN] No pacemaker ID provided");
                    // Send failure message to websocket
                    return;
                }

                pm_serial = std::make_unique<PacemakerSerial>("COM_PORT", 112500);
                pm_serial->set_pm_id(pm_id);
                auto res = pm_serial->search_and_connect("init");

                if (res["status"] == "success") {
                    spdlog::info("[MAIN] Connected to pacemaker");
                    first_connection = false;
                    reconnect_fail = false;
                    // Send success message to websocket
                } else {
                    spdlog::error("[MAIN] Failed to connect to pacemaker");
                    pm_serial->close();
                    pm_serial.reset();
                    reconnect_fail = true;
                    // Send failure message to websocket
                }
            } else {
                spdlog::error("[MAIN] Already connected to pacemaker");
                // Send failure message to websocket
            }
        } else if (data["type"] == "disconnect") {
            if (reconnect_fail) {
                spdlog::error("[MAIN] Already disconnected from pacemaker");
                // Send failure message to websocket
                return;
            }

            if (pm_serial) {
                pm_serial->close();
                pm_serial.reset();
                first_connection = true;
                spdlog::info("[MAIN] Disconnected from pacemaker");
                // Send success message to websocket
            } else {
                spdlog::error("[MAIN] Not connected to pacemaker");
                // Send failure message to websocket
            }
        } else if (data["type"] == "send_parameters") {
            if (!pm_serial || reconnect_fail) {
                spdlog::error("[MAIN] Not connected to pacemaker");
                // Send failure message to websocket
                return;
            }

            auto params = data.value("parameters", json::object());
            if (params.empty()) {
                spdlog::error("[MAIN] No parameters provided");
                // Send failure message to websocket
                return;
            }

            auto res = pm_serial->send_parameters(params);
            if (res["status"] == "success") {
                spdlog::info("[MAIN] Parameters sent successfully");
                // Send success message to websocket
            } else {
                spdlog::error("[MAIN] Failed to send parameters");
                // Send failure message to websocket
            }
        } else if (data["type"] == "toggle_egram") {
            if (!pm_serial || reconnect_fail) {
                spdlog::error("[MAIN] Not connected to pacemaker");
                // Send failure message to websocket
                return;
            }

            bool use_internal = data.value("mode", "") == "internal";
            bool explicit_command = data.value("mode", "") != "internal";

            auto res = pm_serial->toggle_egram(use_internal, explicit_command);
            if (res["status"] == "success") {
                spdlog::info("[MAIN] Egram toggled");
                // Send success message to websocket
            } else {
                spdlog::error("[MAIN] Failed to toggle egram");
                // Send failure message to websocket
            }
        } else {
            spdlog::error("[MAIN] Unknown message type: {}", data["type"]);
            // Send error message to websocket
        }
    }

    void setup_logging() {
        auto file_logger = spdlog::rotating_logger_mt("file_logger", "logs/webserver.log", 1048576 * 5, 3);
        spdlog::set_default_logger(file_logger);
        spdlog::set_level(spdlog::level::info);
        spdlog::set_pattern("%Y-%m-%d %H:%M:%S.%e %l %n: %v");
    }

    bool reconnect_fail;
    bool first_connection;
    int global_pm_id;
    std::unique_ptr<PacemakerSerial> pm_serial;
    std::mutex mtx;
    std::condition_variable cv;
};

int main() {
    WebSocketServer server;
    server.start();

    std::this_thread::sleep_for(std::chrono::hours(24));
    return 0;
}
