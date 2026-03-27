from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pickle

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = pickle.load(open("model.pkl", "rb"))
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