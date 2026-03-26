import mediapipe as mp
import cv2, os, pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

hands = mp.solutions.hands.Hands(static_image_mode=True)
data, labels = [], []

DATASET_PATH = "dataset/asl_alphabet_train/asl_alphabet_train/"

for label in os.listdir(DATASET_PATH):
    folder = f"{DATASET_PATH}/{label}"
    if not os.path.isdir(folder):
        continue
    print(f"Processing {label}...")
    for fname in os.listdir(folder)[:500]:
        img = cv2.imread(f"{folder}/{fname}")
        if img is None:
            continue
        res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if res.multi_hand_landmarks:
            lm = res.multi_hand_landmarks[0]
            feats = [v for p in lm.landmark for v in (p.x, p.y)]
            data.append(feats)
            labels.append(label)

print(f"✅ Extracted {len(data)} samples")

X_train, X_test, y_train, y_test = train_test_split(
    data, labels, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=200, random_state=42)
clf.fit(X_train, y_train)

print(f"✅ Accuracy: {clf.score(X_test, y_test):.2%}")
pickle.dump(clf, open("model.pkl", "wb"))
print("✅ Saved model.pkl")