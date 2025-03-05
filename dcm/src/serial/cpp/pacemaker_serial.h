#pragma once
#include <asio.hpp>
#include <spdlog/spdlog.h>
#include <nlohmann/json.hpp>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <map>
#include <vector>

using json = nlohmann::json;

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
    PacemakerSerial(const std::string& port, unsigned int baud_rate);
    ~PacemakerSerial();

    void write(const std::string& s);
    std::string read();
    bool is_connected();
    bool is_connecting();
    void close();
    void set_pm_id(int id);
    json search_and_connect(const std::string& mode);
    json send_parameters(const json& params);
    json toggle_egram(bool use_internal, bool explicit_command);

private:
    void read_process();
    void poll_process();
    Msg block_until_fulfilled(int msg_id, double timeout);
    int create_msg(int msg_type);
    void send_raw(const std::vector<uint8_t>& payload);
    std::vector<std::string> scan_ports();
    bool serial_connect(const std::string& port);
    json handshake(const std::string& port);

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
};
