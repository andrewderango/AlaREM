#include "websocket_server.h"
#include <chrono>
#include <thread>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include <asio.hpp>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

using json = nlohmann::json;
using namespace std::chrono_literals;

typedef websocketpp::server<websocketpp::config::asio> server;

WebSocketServer::WebSocketServer() : reconnect_fail(false), first_connection(true), global_pm_id(-1) {
    setup_logging();
}

void WebSocketServer::start() {
    std::thread([this]() { this->run(); }).detach();
}

void WebSocketServer::run() {
    server ws_server;

    ws_server.init_asio();

    ws_server.set_open_handler([this](websocketpp::connection_hdl hdl) {
        spdlog::info("WebSocket connection opened");
        this->handle_message("initialize");
    });

    ws_server.set_message_handler([this](websocketpp::connection_hdl hdl, server::message_ptr msg) {
        this->handle_message(msg->get_payload());
    });

    ws_server.set_close_handler([this](websocketpp::connection_hdl hdl) {
        spdlog::info("WebSocket connection closed");
        this->handle_message("disconnect");
    });

    ws_server.listen(8765);
    ws_server.start_accept();

    ws_server.run();
}

void WebSocketServer::reconnect() {
    while (true) {
        try {
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
        } catch (const std::exception& e) {
            spdlog::error("[RECONNECT] Exception: {}", e.what());
        }
        std::this_thread::sleep_for(100ms);
    }
}

void WebSocketServer::handle_message(const std::string& message) {
    try {
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
    } catch (const std::exception& e) {
        spdlog::error("[MAIN] Exception: {}", e.what());
        // Send error message to websocket
    }
}

void WebSocketServer::setup_logging() {
    auto file_logger = spdlog::rotating_logger_mt("file_logger", "logs/webserver.log", 1048576 * 5, 3);
    spdlog::set_default_logger(file_logger);
    spdlog::set_level(spdlog::level::info);
    spdlog::set_pattern("%Y-%m-%d %H:%M:%S.%e %l %n: %v");
}
