import os
import mne

# get all files in the data/physionet/sleep-cassette directory
edf_files = []
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-cassette')))
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-telemetry')))

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
    subject_number = edf_file[3:5]
    night_number = edf_file[5]
    
    df = raw.to_data_frame()
    df = df[['time', 'EEG Fpz-Cz', 'EEG Pz-Oz']]
    df['type'] = data_type
    df['subject'] = subject_number
    df['night'] = night_number
    df['epoch'] = ((df['time'] - df['time'][0]) // 30).astype(int) # new epoch assigned for every 30 seconds
    df['recordId'] = data_type + '-' + subject_number + '-' + night_number + '-' + df['epoch'].astype(str)

    # print(df.head())
    print(df[:1000].to_string())
    print(df.shape[0])
    quit()