"""
Script to train and export ML models from the inventory dataset.
Run this from the project root: python export_models.py
"""

import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN

# Create output directory
os.makedirs("backend/models", exist_ok=True)

# Load dataset
print("Loading dataset...")
df = pd.read_csv("Dataset/Project_IMS.csv")

# ─── 1. ABC/XYZ CLASSIFICATION MODEL (Random Forest) ───────────────────────

print("\nTraining ABC/XYZ classifier (Random Forest)...")

X_clf = df[['Category', 'name', 'mrp', 'availableQuantity',
            'discountedSellingPrice', 'quantity',
            'Annual_Consumption', 'Annual_Value', 'Mean_Demand', 'Std_Demand']]
y_clf = df['Combined_Class']

# One-hot encode categorical columns
categorical_cols = X_clf.select_dtypes(include=['object', 'bool']).columns
X_encoded = pd.get_dummies(X_clf, columns=categorical_cols, drop_first=True)

X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y_clf, test_size=0.2, random_state=42, stratify=y_clf
)

rf_classifier = RandomForestClassifier(random_state=42, n_estimators=100)
rf_classifier.fit(X_train, y_train)

accuracy = rf_classifier.score(X_test, y_test)
print(f"  Classifier accuracy: {accuracy:.4f}")

# Save classifier + feature columns (needed to align new data)
joblib.dump(rf_classifier, "backend/models/abc_xyz_classifier.joblib")
joblib.dump(list(X_encoded.columns), "backend/models/classifier_feature_columns.joblib")
print("  Saved: backend/models/abc_xyz_classifier.joblib")
print("  Saved: backend/models/classifier_feature_columns.joblib")

# ─── 2. DBSCAN ANOMALY DETECTION MODEL ──────────────────────────────────────

print("\nTraining DBSCAN anomaly detector...")

# Calculate Annual_Consumption if not present
consumption_cols = [f'Month_{i}' for i in range(1, 13)]
df['Annual_Consumption'] = df[consumption_cols].sum(axis=1)

high_impact_cols = [
    'availableQuantity', 'Annual_Consumption', 'outOfStock', 'mrp', 'discountedSellingPrice'
]
X_dbscan = df[high_impact_cols].copy()
X_dbscan['outOfStock'] = X_dbscan['outOfStock'].astype(int)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_dbscan)

dbscan = DBSCAN(eps=0.5, min_samples=10)
dbscan.fit(X_scaled)

n_noise = (dbscan.labels_ == -1).sum()
print(f"  DBSCAN fitted. Noise points (anomalies): {n_noise} / {len(df)}")

# Save scaler and DBSCAN model
joblib.dump(scaler, "backend/models/dbscan_scaler.joblib")
joblib.dump(dbscan, "backend/models/dbscan.joblib")
print("  Saved: backend/models/dbscan_scaler.joblib")
print("  Saved: backend/models/dbscan.joblib")

print("\nAll models exported successfully to backend/models/")
print("Files:")
for f in os.listdir("backend/models"):
    size = os.path.getsize(f"backend/models/{f}")
    print(f"  {f}  ({size:,} bytes)")
