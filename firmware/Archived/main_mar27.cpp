#include "mbed.h"

AnalogIn EEG_input(PA_0);
BufferedSerial serial_port(USBTX, USBRX, 115200);

Ticker ticker;
Timer timer;
bool printFlag;
time_t curr_time;
tm curr_tm;
float reading;

void ISR() {
    printFlag = true;
}

// main() runs in its own thread in the OS
int main()
{
    EEG_input.set_reference_voltage(2.94);
    printFlag = false;
    ticker.attach(&ISR, 10ms);
    timer.start();
    //srand(time(NULL)); //del

    while (true) {
        if (printFlag) {
            uint32_t elapsed_ms = chrono::duration_cast<chrono::milliseconds>(timer.elapsed_time()).count();
            reading = EEG_input.read_voltage();
            // reading = rand()/1000000; //del
            printf("Time: %d EEG: %d\n", elapsed_ms, (int)(reading*1000000));
            printFlag = false;
        }
        thread_sleep_for(1);
    }
}

