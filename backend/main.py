from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pickle
import requests
import os

print("NEW DEPLOY 🚀")
app = FastAPI()

# ✅ CORS (ONLY THIS NEEDED)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 DOWNLOAD MODEL IF NOT PRESENT
MODEL_PATH = "model.pkl"
if os.path.exists("model.pkl"):
    os.remove("model.pkl")
if not os.path.exists(MODEL_PATH):
    print("⬇️ Downloading model...")
    url = "https://www.dropbox.com/scl/fi/6gfshx5eg2y60kxpxcjzt/model.pkl?rlkey=kw7w7es6nsi6h509wtrvr1360&st=6qchtc6x&dl=1"
    r = requests.get(url, stream=True)
    with open(MODEL_PATH, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    print("✅ Model downloaded")

# Load model
model = pickle.load(open(MODEL_PATH, "rb"))
labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


@app.get("/")
def home():
    return {"message": "Backend running 🚀"}


@app.post("/predict")
async def predict(data: dict):
    landmarks = data["landmarks"]

    X = np.array(landmarks).reshape(1, -1)

    probs = model.predict_proba(X)[0]
    pred = np.argmax(probs)

    return {
        "letter": labels[pred],
        "confidence": float(probs[pred])
    }
labels = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

@app.post("/predict")
async def predict(data: dict):
    landmarks = data["landmarks"]

    X = np.array(landmarks).reshape(1, -1)

    probs = model.predict_proba(X)[0]
    pred = np.argmax(probs)

    return {
        "letter": labels[pred],
        "confidence": float(probs[pred])
    }

@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}