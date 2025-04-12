#include "mbed.h"

AnalogIn EEG_input(PF_4);
InterruptIn button(BUTTON1);
DigitalOut led(LED2);
BufferedSerial serial_port(USBTX, USBRX, 115200);

Ticker ticker;
Timer timer;
bool printFlag = false;
bool buttonFlag = false;
time_t curr_time;
tm curr_tm;
float reading;

void TickerISR() {
    printFlag = true;
}

void ButtonISR() {
    buttonFlag = !buttonFlag;
    led = buttonFlag;
    timer.reset();
}

// main() runs in its own thread in the OS
int main()
{
    EEG_input.set_reference_voltage(2.94);
    printFlag = false;
    ticker.attach(&TickerISR, 0.00390625);
    button.fall(&ButtonISR);
    timer.start();
    //srand(time(NULL)); //del

    while (true) {
        if (printFlag && buttonFlag) {
            uint32_t elapsed_ms = chrono::duration_cast<chrono::milliseconds>(timer.elapsed_time()).count();
            reading = EEG_input.read_voltage();
            // reading = rand()/1000000; //del
            printf("Time: %d EEG: %d\n", elapsed_ms, (int)(reading*1000000));
            printFlag = false;
        }
        thread_sleep_for(1);
    }
}

