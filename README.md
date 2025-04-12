# AlaREM

AlaREM is a smart, EEG-informed wearable alarm system designed to reduce daytime fatigue and improve morning alertness. By monitoring real-time neurological activity within the brain, the device tracks the user’s sleep cycle and intelligently triggers the alarm at an optimal point. The system is powered by an STM32 microcontroller, the BioAmp EXG Pill for EEG acquisition, and a machine learning model (MLP) for sleep stage classification.

## 🧠 Overview

Waking up from deep sleep often leads to daytime fatigue and reduced cognitive performance. AlaREM addresses this by identifying the user's sleep stage in real-time and waking them during lighter stages of sleep within a customizable wake-up interval. By adapting the model’s sensitivity to the length of the interval, the system balances user preference with sleep optimization. The result is a smoother, more energized start to the day.

## ⚙️ Key Features

- 🧠 **EEG-Based Monitoring**  
  Real-time brain activity monitoring using the [BioAmp EXG Pill](https://github.com/upsidedownlabs/BioAmp-EXG-Pill) with a dual-electrode setup.

- ⏰ **Smart Alarm Logic**  
  Triggers the alarm during lighter stages of sleep within a user-defined wake-up interval.

- 🎚️ **Adaptive Thresholding**  
  The sleep stage classifier uses a dynamic confidence threshold: longer intervals require higher confidence from the model before triggering the alarm, while shorter intervals allow more flexibility.

- 🤖 **ML-Based Sleep Stage Classification**  
  A trained Multi-Layer Perceptron (MLP) model classifies sleep stages from EEG frequency features.

- 📱 **User Interface**  
  Electron-based desktop application for alarm setup, sleep tracking, and data visualization.

- 📉 **Failsafe Alarm Mechanism**  
  If no light sleep is detected by the end of the interval, a backup alarm ensures the user still wakes up on time.

## 💡 System Workflow

1. User selects a flexible wake-up interval (e.g., 6:30–7:00 AM) using the Electron app.
2. EEG signals are continuously captured via the BioAmp EXG Pill and processed in real-time on the STM32 microcontroller.
3. The MLP model classifies the current sleep stage using frequency-domain features.
4. A dynamic confidence threshold is applied:  
   - **Long intervals** → Higher threshold (model must be more certain of light sleep)  
   - **Short intervals** → Lower threshold (more flexibility in model decision)
5. When the model confidently detects a sufficiency light stage of sleep within the interval, the alarm is triggered.

## 🧰 Tech Stack

### 🧪 Hardware
- **Microcontroller**: STM32 (ARM Cortex-M series)
- **EEG Acquisition Module**: [BioAmp EXG Pill](https://github.com/upsidedownlabs/BioAmp-EXG-Pill) with dual-channel electrode input at 256 Hz
- **Communication**: UART serial connection to desktop

### 💻 Software
- **Embedded Programming**: C++ (STM32 HAL)
- **Signal Processing**: Fast Fourier Transform (FFT) and power band extraction (delta, theta, alpha, beta)
- **ML Model**: Multi-Layer Perceptron (MLP) trained in Python
- **Sleep Training Data**: EEG recordings from [PhysioNet](https://physionet.org/content/sleep-edfx/1.0.0/) database (197 nights, 100 subjects) at 100 Hz
- **Hyperparameter Tuning Framework**: Leave-One-Out Cross-Validation (LOOCV)
- **Desktop Application**: Electron with Next.js
