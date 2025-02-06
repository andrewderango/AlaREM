import os
import mne
import pandas as pd

# Load the EDF+ annotation file
edf_file = os.path.join('data', 'physionet', 'sleep-cassette', 'SC4001EC-Hypnogram.edf')

# Use mne.read_annotations() for annotation-only files
annotations = mne.read_annotations(edf_file)

annotations_df = pd.DataFrame({
    "onset": annotations.onset,
    "duration": annotations.duration,
    "description": annotations.description
})
print(annotations_df)
