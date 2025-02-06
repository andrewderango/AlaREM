import os
import mne
import numpy as np
import pandas as pd

# get all files in the data/physionet/sleep-cassette directory
edf_files = []
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-cassette')))
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-telemetry')))

def compute_power_bands(signal, sfreq):
    freqs = np.fft.rfftfreq(len(signal), d=1/sfreq)
    fft_vals = np.abs(np.fft.rfft(signal))**2

    power_bands = {
        'subdelta': np.sum(fft_vals[freqs < 0.5]),
        'delta': np.sum(fft_vals[(freqs >= 0.5) & (freqs < 4)]),
        'theta': np.sum(fft_vals[(freqs >= 4) & (freqs < 8)]),
        'alpha': np.sum(fft_vals[(freqs >= 8) & (freqs < 12)]),
        'beta': np.sum(fft_vals[(freqs >= 12) & (freqs < 30)]),
        'gamma': np.sum(fft_vals[(freqs >= 30) & (freqs < 100)])
    }
    return power_bands

for edf_file in edf_files:
    if 'Hypnogram' in edf_file:
        continue
    print(edf_file)

    if edf_file[1] == 'T':
        raw = mne.io.read_raw_edf(os.path.join('data', 'physionet', 'sleep-telemetry', edf_file), preload=True, verbose=False)
        data_type = 'telemetry'
    elif edf_file[1] == 'C':
        raw = mne.io.read_raw_edf(os.path.join('data', 'physionet', 'sleep-cassette', edf_file), preload=True, verbose=False)
        data_type = 'cassette'
    else:
        raise ValueError('Invalid file name')
    
    sfreq = raw.info['sfreq']
    subject_number = edf_file[3:5]
    night_number = edf_file[5]
    
    df = raw.to_data_frame()
    df = df[['time', 'EEG Fpz-Cz', 'EEG Pz-Oz']]
    df.columns = ['time', 'eegAnterior', 'eegPosterior']
    df['type'] = data_type
    df['subject'] = subject_number
    df['night'] = night_number
    df['epochNum'] = ((df['time'] - df['time'][0]) // 30).astype(int) # new epoch assigned for every 30 seconds
    df['epochId'] = data_type + '-' + subject_number + '-' + night_number + '-' + df['epochNum'].astype(str)

    epochs = df.groupby('epochId')

    for epoch_id, epoch_df in epochs:
        eeg_anterior = epoch_df['eegAnterior'].values
        eeg_posterior = epoch_df['eegPosterior'].values

        power_bands_anterior = compute_power_bands(eeg_anterior, sfreq)
        power_bands_posterior = compute_power_bands(eeg_posterior, sfreq)

        print(f"Epoch ID: {epoch_id}")
        print("Anterior EEG Power Bands:", power_bands_anterior)
        print("Posterior EEG Power Bands:", power_bands_posterior)
        print()

    print(df[:10].to_string())
    print(df.shape[0])
    quit()