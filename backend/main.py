


#model = pickle.load(open("model.pkl", "rb"))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pickle
import requests
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 DOWNLOAD MODEL IF NOT PRESENT
MODEL_PATH = "model.pkl"

if not os.path.exists(MODEL_PATH):
    print("⬇️ Downloading model...")
    url = "https://drive.google.com/uc?export=download&id=1RjLFTrL1jMsne4b3xkOFvdAdjUsAWy5K"
    r = requests.get(url)
    with open(MODEL_PATH, "wb") as f:
        f.write(r.content)
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