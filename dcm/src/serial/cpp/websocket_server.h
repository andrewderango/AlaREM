#pragma once
#include "pacemaker_serial.h"
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>
#include <thread>
#include <mutex>
#include <condition_variable>

class WebSocketServer {
public:
    WebSocketServer();
    void start();

private:
    void run();
    void reconnect();
    void handle_message(const std::string& message);
    void setup_logging();

    bool reconnect_fail;
    bool first_connection;
    int global_pm_id;
    std::unique_ptr<PacemakerSerial> pm_serial;
    std::mutex mtx;
    std::condition_variable cv;
};
