"""
FinBERT sentiment microservice for TradeNeuron.

Exposes POST /sentiment which accepts a JSON body with a "headlines" array
and returns sentiment scores using the ProsusAI/finbert model.

Usage:
    pip install fastapi uvicorn transformers torch
    python sentiment_server.py
"""

import os
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

app = FastAPI(title="TradeNeuron FinBERT Sentiment")

model_name = "ProsusAI/finbert"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
sentiment_pipeline = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)


class SentimentRequest(BaseModel):
    headlines: List[str]


class SentimentResult(BaseModel):
    text: str
    label: str
    score: float


class SentimentResponse(BaseModel):
    results: List[SentimentResult]
    aggregate_score: float


@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    if not request.headlines:
        return SentimentResponse(results=[], aggregate_score=0.0)

    raw = sentiment_pipeline(request.headlines, truncation=True, max_length=512)

    results = []
    score_sum = 0.0
    for text, pred in zip(request.headlines, raw):
        label = pred["label"].lower()
        confidence = pred["score"]
        mapped = {"positive": confidence, "negative": -confidence, "neutral": 0.0}
        numeric = mapped.get(label, 0.0)
        score_sum += numeric
        results.append(SentimentResult(text=text, label=label, score=numeric))

    aggregate = score_sum / len(results) if results else 0.0

    return SentimentResponse(results=results, aggregate_score=aggregate)


@app.get("/health")
async def health():
    return {"status": "ok", "model": model_name}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("FINBERT_PORT", "8765"))
    uvicorn.run(app, host="0.0.0.0", port=port)
