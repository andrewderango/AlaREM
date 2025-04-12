import os
import mne
import numpy as np
import pandas as pd
from tqdm import tqdm

def compute_power_bands(signal, sampling_frequency):
    freqs = np.fft.rfftfreq(len(signal), d=1/sampling_frequency)
    fft_vals = np.abs(np.fft.rfft(signal))**2

    total_power = np.sum(fft_vals)
    power_bands = {
        'subdelta': np.sum(fft_vals[freqs < 0.5]),
        'delta': np.sum(fft_vals[(freqs >= 0.5) & (freqs < 4)]),
        'theta': np.sum(fft_vals[(freqs >= 4) & (freqs < 8)]),
        'alpha': np.sum(fft_vals[(freqs >= 8) & (freqs < 12)]),
        'beta': np.sum(fft_vals[(freqs >= 12) & (freqs < 30)]),
        'gamma': np.sum(fft_vals[(freqs >= 30)]),
    }
    power_ratios = {band: round(power / total_power, 5) for band, power in power_bands.items()}
    
    return power_bands, power_ratios

def load_edf_files(edf_files):
    for edf_file in edf_files:
        if 'Hypnogram' in edf_file:
            continue
        yield edf_file

def process_edf_file(edf_file):
    if edf_file[1] == 'T':
        raw = mne.io.read_raw_edf(os.path.join('data', 'physionet', 'sleep-telemetry', edf_file), preload=True, verbose=False)
        data_type = 'telemetry'
    elif edf_file[1] == 'C':
        raw = mne.io.read_raw_edf(os.path.join('data', 'physionet', 'sleep-cassette', edf_file), preload=True, verbose=False)
        data_type = 'cassette'
    else:
        raise ValueError('Invalid file name')
    
    sampling_frequency = raw.info['sfreq']
    subject_number = edf_file[3:5]
    night_number = edf_file[5]
    
    df = raw.to_data_frame()
    df = df[['time', 'EEG Fpz-Cz', 'EEG Pz-Oz']]
    df.columns = ['time', 'eegAnterior', 'eegPosterior']
    df['type'] = data_type
    df['subject'] = subject_number
    df['night'] = night_number
    df['epochNum'] = ((df['time'] - df['time'][0]) // 30).astype(int) # new epoch assigned for every 30 seconds
    df['epochId'] = data_type + '-' + subject_number + '-' + night_number + '-' + df['epochNum'].apply(lambda x: f"{x:04d}")

    return df, sampling_frequency

def compute_power_bands_for_epochs(df, sampling_frequency):
    epochs = df.groupby('epochId')
    power_bands_list = []

    for epoch_id, epoch_df in epochs:
        eeg_anterior = epoch_df['eegAnterior'].values
        eeg_posterior = epoch_df['eegPosterior'].values

        power_bands_anterior, ratios_anterior = compute_power_bands(eeg_anterior, sampling_frequency)
        power_bands_posterior, ratios_posterior = compute_power_bands(eeg_posterior, sampling_frequency)

        power_bands = {
            'epochId': epoch_id,
            **{f'anterior_{band}': power for band, power in power_bands_anterior.items()},
            **{f'posterior_{band}': power for band, power in power_bands_posterior.items()},
            **{f'anterior_{band}_ratio': ratio for band, ratio in ratios_anterior.items()},
            **{f'posterior_{band}_ratio': ratio for band, ratio in ratios_posterior.items()}
        }
        power_bands_list.append(power_bands)

    return pd.DataFrame(power_bands_list)

def preprocess_features(preprocess_features, download_files):

    if preprocess_features:
        edf_files = []
        edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-cassette')))
        edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-telemetry')))
        edf_files = [edf_file for edf_file in edf_files if 'Hypnogram' not in edf_file]
        all_epochs_power_bands_df = []

        for edf_file in tqdm(edf_files, desc='Processing Nights (Features)', colour='GREEN'):
            raw_data_df, sampling_freq = process_edf_file(edf_file)
            epochs_power_bands_df = compute_power_bands_for_epochs(raw_data_df, sampling_freq)
            all_epochs_power_bands_df.append(epochs_power_bands_df)

        all_epochs_power_bands_df = pd.concat(all_epochs_power_bands_df, ignore_index=True)

        if download_files:
            all_epochs_power_bands_df.to_csv(os.path.join('data', 'physionet', 'frequency_spectrum_data.csv'), index=False)
            print('Data saved to data/physionet/frequency_spectrum_data.csv')
            print(f"File Size: {all_epochs_power_bands_df.memory_usage(deep=True).sum() / 1e6:.2f} MB")

    else:
        all_epochs_power_bands_df = pd.read_csv(os.path.join('data', 'physionet', 'frequency_spectrum_data.csv'))

    return all_epochs_power_bands_df

def extract_annotations(edfp_file):
    if edfp_file[1] == 'T':
        raw = mne.read_annotations(os.path.join('data', 'physionet', 'sleep-telemetry', edfp_file))
        data_type = 'telemetry'
    elif edfp_file[1] == 'C':
        raw = mne.read_annotations(os.path.join('data', 'physionet', 'sleep-cassette', edfp_file))
        data_type = 'cassette'
    else:
        raise ValueError('Invalid file name')

    annotations_df = pd.DataFrame({
        "onset": raw.onset,
        "duration": raw.duration,
        "end": raw.onset + raw.duration,
        "sleep_stage": raw.description
    })
    annotations_df['sleep_stage'] = annotations_df['sleep_stage'].apply(lambda x: 'M' if x == 'Movement time' else x.split(' ')[-1])
    
    subject_number = edfp_file[3:5]
    night_number = edfp_file[5]
    annotations_df['epochId'] = annotations_df.apply(lambda row: f"{data_type}-{subject_number}-{night_number}-{int(row['onset'] // 30):04d}", axis=1)
    
    return annotations_df, data_type, subject_number, night_number

def generate_labels(annotations_df, data_type, subject_number, night_number):
    labels_list = []
    epochs = int((annotations_df.iloc[-1]['onset'] + annotations_df.iloc[-1]['duration']) // 30)

    for epoch in range(epochs):
        min_timestamp = epoch * 30
        max_timestamp = (epoch + 1) * 30
        epoch_id = f"{data_type}-{subject_number}-{night_number}-{epoch:04d}"
        interval_epoch_annotations = annotations_df[(annotations_df['onset'] < max_timestamp) & (annotations_df['end'] > min_timestamp)]
        if len(interval_epoch_annotations) == 0:
            sleep_stage = 'N' # no label available
        elif len(interval_epoch_annotations) == 1:
            sleep_stage = interval_epoch_annotations.iloc[0]['sleep_stage']
        else:
            sleep_stage = 'T' # transition epoch
        labels_list.append({
            'epochId': epoch_id,
            'sleep_stage': sleep_stage
        })

    return labels_list

def preprocess_labels(all_epochs_power_bands_df, preprocess_labels, download_files):

    labelled_epochs_power_bands_df = all_epochs_power_bands_df.copy(deep=True)

    if preprocess_labels:
        edfp_files = []
        edfp_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-cassette')))
        edfp_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-telemetry')))
        edfp_files = [edf_file for edf_file in edfp_files if 'Hypnogram' in edf_file]

        labels_list = []
        for edfp_file in tqdm(edfp_files, desc='Processing Nights (Labels)', colour='GREEN'):
            annotations_df, data_type, subject_number, night_number = extract_annotations(edfp_file)
            labels_list.extend(generate_labels(annotations_df, data_type, subject_number, night_number))

        labels_df = pd.DataFrame(labels_list)
        labelled_epochs_power_bands_df = labelled_epochs_power_bands_df.merge(labels_df, on='epochId', how='left')
        labelled_epochs_power_bands_df['sleep_stage'] = labelled_epochs_power_bands_df['sleep_stage'].fillna('N')

    else:
        labelled_epochs_power_bands_df = pd.read_csv(os.path.join('data', 'physionet', 'labelled_frequency_spectrum_data.csv'))

    # Save the merged dataframe if needed
    if download_files:
        labelled_epochs_power_bands_df.to_csv(os.path.join('data', 'physionet', 'labelled_frequency_spectrum_data.csv'), index=False)
        print('Data with labels saved to data/physionet/labelled_frequency_spectrum_data.csv')

    return labelled_epochs_power_bands_df