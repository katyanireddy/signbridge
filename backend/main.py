from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import numpy as np

app = FastAPI()

# Load model
model = pickle.load(open("model.pkl", "rb"))

# Input format
class InputData(BaseModel):
    data: list

@app.get("/")
def home():
    return {"message": "SignBridge Backend Running 🚀"}

@app.post("/predict")
def predict(input_data: InputData):
    try:
        features = np.array(input_data.data).reshape(1, -1)

        prediction = model.predict(features)[0]

        return {
            "letter": str(prediction),
            "confidence": 0.95   # placeholder (can improve later)
        }

    except Exception as e:
        return {"error": str(e)}
    
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)