from preprocessing_functions import *

def main():
    all_epochs_power_bands_df = preprocess_features(preprocess_features=False, download_files=False)

    # print(all_epochs_power_bands_df)
    # print(all_epochs_power_bands_df.describe().T)

    preprocess_labels(all_epochs_power_bands_df)

    return

if __name__ == "__main__":
    main()