import serial
import csv
import time
import numpy as np
import matplotlib.pyplot as plt
from scipy.fftpack import fft
from collections import deque

# Serial port configuration
SERIAL_PORT = "COM7"
BAUD_RATE = 115200

# Data storage
TIME_WINDOW = 30  # seconds
SAMPLE_RATE = 256  # Hz
BUFFER_SIZE = TIME_WINDOW * SAMPLE_RATE

data_buffer = deque(maxlen=BUFFER_SIZE)
time_buffer = deque(maxlen=BUFFER_SIZE)

plt.ion()  # Enable interactive mode

def read_serial_data():
    """Reads data from the serial port and appends it to the buffer and CSV."""
    with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser, open("eeg_data.csv", "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Time", "EEG"])
        
        while True:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line.startswith("Time:") and "EEG:" in line:
                    parts = line.split()
                    timestamp = float(parts[1])/1000
                    eeg_value = float(parts[3])/1000000
                    
                    writer.writerow([timestamp, eeg_value])
                    file.flush()
                    
                    data_buffer.append(eeg_value)
                    time_buffer.append(timestamp)

                    if len(data_buffer) % (SAMPLE_RATE/4) == 0:
                        plot_timedomain()

                    # One Reading
                    if len(data_buffer) >= BUFFER_SIZE:
                        print("Plot Generating")
                        plot_fft()
                        press = input()
                        ser.reset_input_buffer()
                        data_buffer.clear()
                        time_buffer.clear()

                    # # Continuous Reading
                    # if len(data_buffer) >= BUFFER_SIZE:
                    #     print("Plot Generating")
                    #     plot_fft()
                    #     data_buffer.clear()
                    #     time_buffer.clear()

            except Exception as e:
                print(f"Error: {e}")
                continue

def plot_timedomain():
    """Plots EEG data in the time domain in real-time."""
    if len(data_buffer) == 0:
        return
    
    plt.figure(2)  # Use a consistent figure ID
    plt.clf()  # Clear the previous plot
    plt.plot(time_buffer, data_buffer, color="blue")
    plt.xlabel("Time (s)")
    plt.ylabel("EEG Amplitude")
    plt.title("Real-Time EEG Signal")
    plt.grid()
    plt.pause(0.001)  # Small pause to allow real-time updating

def plot_fft():
    """Generates and displays an FFT plot based on the last 30s of data."""
    if len(data_buffer) < BUFFER_SIZE:
        return  # Not enough data yet
    
    eeg_array = np.array(data_buffer)
    N = len(eeg_array)
    T = 1.0 / SAMPLE_RATE  # Sample interval
    xf = np.fft.fftfreq(N, T)[:N//2]  # Frequency axis
    yf = np.abs(fft(eeg_array)[:N//2])  # FFT magnitude
    
    plt.figure(1)  # Use a consistent figure ID
    plt.clf()  # Clear the previous plot
    plt.plot(xf, yf, color="red")
    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Amplitude")
    plt.title("FFT of EEG Data (Last 30s)")
    plt.grid()
    
    plt.pause(0.5)  # Pause to allow rendering

if __name__ == "__main__":
    read_serial_data()