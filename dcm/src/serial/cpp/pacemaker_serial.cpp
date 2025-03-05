#include "pacemaker_serial.h"
#include <chrono>
#include <random>
#include <thread>

using namespace std::chrono_literals;

PacemakerSerial::PacemakerSerial(const std::string& port, unsigned int baud_rate)
    : io(), serial(io, port), read_running(false), poll_running(false), connected(false), connecting(true) {
    serial.set_option(asio::serial_port_base::baud_rate(baud_rate));
}

PacemakerSerial::~PacemakerSerial() {
    close();
}

void PacemakerSerial::write(const std::string& s) {
    asio::write(serial, asio::buffer(s.c_str(), s.size()));
}

std::string PacemakerSerial::read() {
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

bool PacemakerSerial::is_connected() {
    return connected;
}

bool PacemakerSerial::is_connecting() {
    return connecting;
}

void PacemakerSerial::close() {
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

void PacemakerSerial::set_pm_id(int id) {
    pm_id = id;
}

json PacemakerSerial::search_and_connect(const std::string& mode) {
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

json PacemakerSerial::send_parameters(const json& params) {
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

json PacemakerSerial::toggle_egram(bool use_internal, bool explicit_command) {
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

void PacemakerSerial::read_process() {
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

void PacemakerSerial::poll_process() {
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

Msg PacemakerSerial::block_until_fulfilled(int msg_id, double timeout) {
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

int PacemakerSerial::create_msg(int msg_type) {
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

std::vector<std::string> PacemakerSerial::scan_ports() {
    std::vector<std::string> ports;
    // Add logic to scan and populate available ports
    return ports;
}

bool PacemakerSerial::serial_connect(const std::string& port) {
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

json PacemakerSerial::handshake(const std::string& port) {
    json handshake_msg = {{"type", "handshake"}, {"port", port}};
    write(handshake_msg.dump());
    auto response = read();
    return json::parse(response);
}

void PacemakerSerial::send_raw(const std::vector<uint8_t>& payload) {
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
