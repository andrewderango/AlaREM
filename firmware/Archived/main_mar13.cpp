#include "mbed.h"

AnalogIn EEG_input(PA_0);

Ticker ticker;
bool isPrint;
time_t curr_time;
tm curr_tm;
float reading;

void ISR() {
    isPrint = true;
}

// main() runs in its own thread in the OS
int main()
{
    EEG_input.set_reference_voltage(2.94);
    tm t;
    t.tm_year = 124; // years since 1900
    t.tm_mon = 0;
    t.tm_mday = 1;
    t.tm_hour = 0;
    t.tm_min = 0;
    t.tm_sec = 0;
    set_time(mktime(&t));
    isPrint = false;
    ticker.attach(&ISR, 10ms);

    while (true) {
        if (isPrint) {
            time(&curr_time);
            curr_tm = *localtime(&curr_time);
            reading = EEG_input.read_voltage();
            printf("Time: %d EEG: %d\n", (int)curr_tm.tm_sec, (int)(reading*1000000));
            isPrint = false;
        }
        thread_sleep_for(1);
    }
}

