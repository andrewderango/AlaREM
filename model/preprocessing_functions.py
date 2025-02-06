import os
import mne

# get all files in the data/physionet/sleep-cassette directory
edf_files = []
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-cassette')))
edf_files.extend(os.listdir(os.path.join('data', 'physionet', 'sleep-telemetry')))
print(edf_files)
print(len(edf_files))

for edf_file in edf_files:
    if 'Hypnogram' in edf_file:
        continue
    print(edf_file)

quit()


edf_file = os.path.join('data', 'physionet', 'sleep-cassette', 'SC4001E0-PSG.edf')
raw = mne.io.read_raw_edf(edf_file, preload=True)

# convert whole thing to dataframe
df = raw.to_data_frame()
df = df[['time', 'EEG Fpz-Cz', 'EEG Pz-Oz']]
print(df.head())