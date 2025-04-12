import serial
import struct
import time

serial = serial.Serial(
    # port='/dev/ttyACM0', # linux port
    port='/dev/tty.usbmodem0000001234561', # mac port
    baudrate=115200,
)

def send_data(fn_code, red_enable, green_enable, blue_enable, off_time, switch_time):
    data = bytearray()
    data.append(0x16)
    data.append(fn_code)
    data.append(red_enable)
    data.append(green_enable)
    data.append(blue_enable)
    data.extend(struct.pack('<f', off_time))
    data.extend(struct.pack('<H', switch_time))

    serial.write(data)

def read_echoed_settings():
    send_data(0x22, 0x00, 0x00, 0x00, 0.0, 0)
    response = serial.read(9)
    red_enable = response[0]
    green_enable = response[1]
    blue_enable = response[2]
    off_time = struct.unpack('<f', response[3:7])[0]
    switch_time = struct.unpack('<H', response[7:9])[0]

    print(f"Red: {red_enable}, Green: {green_enable}, Blue: {blue_enable}, Off Time: {off_time}, Switch Time: {switch_time}")

if __name__ == "__main__":
    while True:
        try:
            send_data(0x55, 0x01, 0x00, 0x00, 0.1, 1000)
            time.sleep(5)
            read_echoed_settings()
            time.sleep(5)
            send_data(0x55, 0x01, 0x01, 0x01, 0.1, 1000)
            time.sleep(5)
            read_echoed_settings()
            time.sleep(5)
        except KeyboardInterrupt:
            print("Exiting...")
            break
    
    serial.close()