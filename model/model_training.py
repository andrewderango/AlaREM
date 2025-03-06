import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, roc_curve, precision_score, recall_score, f1_score, log_loss, confusion_matrix, precision_recall_curve, auc, matthews_corrcoef
import matplotlib.pyplot as plt
import seaborn as sns

def train_model(labelled_epochs_power_bands_df):
    train_df = labelled_epochs_power_bands_df.copy(deep=True)
    train_df['person'] = train_df['epochId'].apply(lambda x: x.split('-')[1])
    train_df = train_df[~train_df['sleep_stage'].isin(['N', '?', 'M'])]

    features = ['anterior_subdelta', 'anterior_delta', 'anterior_theta', 'anterior_alpha', 'anterior_beta', 'anterior_gamma']
    label = 'sleep_stage'

    X = train_df[features]
    y = train_df[label].apply(lambda x: 1 if x in ('1', '2') else 0)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = xgb.XGBClassifier(objective='binary:logistic', n_estimators=100, learning_rate=0.1, max_depth=5)
    model.fit(X_train, y_train)

    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    y_train_prob = model.predict_proba(X_train)[:, 1]
    y_test_prob = model.predict_proba(X_test)[:, 1]

    train_accuracy = accuracy_score(y_train, y_train_pred)
    train_roc_auc = roc_auc_score(y_train, y_train_prob)
    train_precision = precision_score(y_train, y_train_pred)
    train_recall = recall_score(y_train, y_train_pred)
    train_f1 = f1_score(y_train, y_train_pred)
    train_log_loss = log_loss(y_train, y_train_prob)
    train_conf_matrix = confusion_matrix(y_train, y_train_pred)
    train_precision_lst, train_recall_lst, _ = precision_recall_curve(y_train, y_train_prob)
    train_auc_pr = auc(train_recall_lst, train_precision_lst)
    train_mcc = matthews_corrcoef(y_train, y_train_pred)

    test_accuracy = accuracy_score(y_test, y_test_pred)
    test_roc_auc = roc_auc_score(y_test, y_test_prob)
    test_precision = precision_score(y_test, y_test_pred)
    test_recall = recall_score(y_test, y_test_pred)
    test_f1 = f1_score(y_test, y_test_pred)
    test_log_loss = log_loss(y_test, y_test_prob)
    test_conf_matrix = confusion_matrix(y_test, y_test_pred)
    test_precision_lst, test_recall_lst, _ = precision_recall_curve(y_test, y_test_prob)
    test_auc_pr = auc(test_recall_lst, test_precision_lst)
    test_mcc = matthews_corrcoef(y_test, y_test_pred)

    print('-- TRAINING METRICS --')
    print(f"Train Accuracy: {train_accuracy}")
    print(f"Train ROC AUC: {train_roc_auc}")
    print(f"Train Precision: {train_precision}")
    print(f"Train Recall: {train_recall}")
    print(f"Train F1-score: {train_f1}")
    print(f"Train Log Loss: {train_log_loss}")
    print(f"Train AUC-PR: {train_auc_pr}")
    print(f"Train MCC: {train_mcc}")
    print(f"Train Confusion Matrix:\n{train_conf_matrix}")

    print('\n-- TESTING METRICS --')
    print(f"Test Accuracy: {test_accuracy}")
    print(f"Test ROC AUC: {test_roc_auc}")
    print(f"Test Precision: {test_precision}")
    print(f"Test Recall: {test_recall}")
    print(f"Test F1-score: {test_f1}")
    print(f"Test Log Loss: {test_log_loss}")
    print(f"Test AUC-PR: {test_auc_pr}")
    print(f"Test MCC: {test_mcc}")
    print(f"Test Confusion Matrix:\n{test_conf_matrix}")

    fpr, tpr, _ = roc_curve(y_test, y_test_prob)
    plt.figure()
    plt.plot(fpr, tpr, color='darkorange', lw=2, label='ROC curve (AUC = %0.3f)' % test_roc_auc)
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve')
    plt.legend(loc="lower right")
    plt.show()

    precision, recall, _ = precision_recall_curve(y_test, y_test_prob)
    auc_pr = auc(recall, precision)
    plt.figure()
    plt.plot(recall, precision, color='blue', lw=2, label='Precision-Recall curve (AUC = %0.3f)' % auc_pr)
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curve')
    plt.legend(loc="lower left")
    plt.show()

    plt.figure(figsize=(10, 7))
    sns.heatmap(test_conf_matrix, annot=True, fmt='d', cmap='Blues', xticklabels=['Other', 'N1 Sleep'], yticklabels=['Other', 'N1 Sleep'])
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.show()

    return model