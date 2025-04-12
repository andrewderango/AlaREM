import serial
import csv
import time
import numpy as np
import matplotlib.pyplot as plt
from scipy.fftpack import fft
from collections import deque
from scipy.signal import butter, filtfilt, iirnotch

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
    with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser, open("eeg_data_filtered.csv", "w", newline="") as file:
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

                    if len(data_buffer) >= BUFFER_SIZE:
                        print("Plot Generating")
                        plot_fft()
                        data_buffer.clear()
                        time_buffer.clear()

            except Exception as e:
                print(f"Error: {e}")
                continue

def apply_filters(data, sample_rate=256, notch_freq=60, bandpass_low=1, bandpass_high=120):
    """Applies a notch filter at `notch_freq` Hz and a bandpass filter (1-40 Hz) to the EEG data."""
    
    # Notch Filter (Remove Power Line Noise)
    Q = 30.0  # Quality factor (adjust as needed)
    b_notch, a_notch = iirnotch(notch_freq, Q, sample_rate)
    data = filtfilt(b_notch, a_notch, data)

    # Bandpass Filter (1Hz–40Hz)
    order = 4  # Butterworth filter order
    nyquist = 0.5 * sample_rate
    low = bandpass_low / nyquist
    high = bandpass_high / nyquist
    b_band, a_band = butter(order, [low, high], btype="band")
    data = filtfilt(b_band, a_band, data)

    return data

def plot_timedomain():
    """Plots filtered EEG data in the time domain in real-time."""
    if len(data_buffer) == 0:
        return
    
    filtered_data = apply_filters(np.array(data_buffer), SAMPLE_RATE)
    
    plt.figure(2)  # Use a consistent figure ID
    plt.clf()  # Clear the previous plot
    plt.plot(time_buffer, filtered_data, color="blue")
    plt.xlabel("Time (s)")
    plt.ylabel("Filtered EEG Amplitude")
    plt.title("Real-Time EEG Signal (Filtered)")
    plt.grid()
    plt.pause(0.001)  # Small pause to allow real-time updating

def plot_fft():
    """Generates and displays an FFT plot based on the last 30s of filtered data."""
    if len(data_buffer) < BUFFER_SIZE:
        return  # Not enough data yet
    
    eeg_array = np.array(data_buffer)
    filtered_data = apply_filters(eeg_array, SAMPLE_RATE)

    N = len(filtered_data)
    T = 1.0 / SAMPLE_RATE  # Sample interval
    xf = np.fft.fftfreq(N, T)[:N//2]  # Frequency axis
    yf = np.abs(fft(filtered_data)[:N//2])  # FFT magnitude
    
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