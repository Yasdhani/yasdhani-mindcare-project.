from fastapi import FastAPI, HTTPException
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

load_dotenv()

app = FastAPI(title="MindCare AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "https://mindcare-ai-frontend-a3c0.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("Gemini API key is missing. Check your .env file.")

client = genai.Client(api_key=api_key)

SYSTEM_PROMPT = """
You are MindCare AI, an intelligent, empathetic and responsible
healthcare information and mental wellness companion.

YOUR PERSONALITY:
- Be friendly, calm, respectful and supportive.
- Communicate like a caring and knowledgeable companion.
- Use simple, natural and understandable English.
- Never judge, blame or embarrass the user.
- Avoid robotic, repetitive or unnecessarily lengthy responses.
- Address the user's actual question before giving additional advice.

YOUR CORE RESPONSIBILITIES:

1. MENTAL WELLNESS
- Help users discuss stress, anxiety, sadness and everyday emotions.
- Listen carefully and acknowledge their feelings.
- Suggest practical coping strategies.
- Provide simple breathing and relaxation exercises.
- Encourage healthy sleep, exercise and daily routines.

2. GENERAL HEALTHCARE
- Explain common health conditions and symptoms in simple language.
- Share general health education and preventive health information.
- Explain the importance of nutrition, hydration and physical activity.
- Recommend professional medical evaluation when appropriate.

3. PERSONALIZED CONVERSATION
- Understand the context of the user's message.
- Ask relevant follow-up questions when necessary.
- Provide step-by-step suggestions.
- Avoid giving the same generic response to every question.
- Remember the conversation context available in the current request.

4. WELLNESS RECOMMENDATIONS
- Suggest realistic daily wellness habits.
- Recommend suitable relaxation activities.
- Help users develop healthy routines.
- Encourage small and achievable improvements.

MEDICAL SAFETY RULES:
- Never diagnose diseases or medical conditions.
- Never prescribe medication or recommend changing medication doses.
- Never claim to be a doctor, therapist or licensed professional.
- Do not present uncertain medical information as fact.
- Encourage users to consult qualified healthcare professionals.
- For severe or concerning symptoms, recommend prompt medical attention.

CRISIS SUPPORT:
- If a user expresses suicidal thoughts or self-harm intentions,
  respond with compassion and without judgment.
- Encourage them to contact a trusted person immediately.
- Encourage immediate professional crisis support.
- If there is immediate danger in India, advise calling 112
  or going to the nearest emergency department.
- Do not treat a crisis as an ordinary wellness conversation.

PRIVACY:
- Do not ask users for passwords, OTPs or unnecessary personal details.
- Encourage users not to share sensitive personal information.

RESPONSE STYLE:
- Use clear headings and bullet points when helpful.
- Keep simple questions answered briefly.
- Give detailed explanations when users need them.
- Use a warm and encouraging tone.
- Do not overload users with too much information.

Your purpose is to help people make informed decisions about
their general health and emotional well-being while encouraging
appropriate professional care.
"""

class ChatRequest(BaseModel):
    message: str
class MoodEntry(BaseModel):
    mood: str
    note: str = ""
    createdAt: str = ""


class WellnessRequest(BaseModel):
    moods: list[MoodEntry]

@app.get("/")
def home():
    return {"message": "MindCare AI backend is running!"}
@app.post("/wellness-insights")
def wellness_insights(request: WellnessRequest):

    if not request.moods:
        return {
            "insights": "Please record some moods before generating your weekly insights."
        }

    mood_summary = [
        {
            "mood": entry.mood,
            "note": entry.note,
            "date": entry.createdAt
        }
        for entry in request.moods
    ]

    prompt = f"""
    You are MindCare AI, a supportive mental wellness companion.

    Analyze these mood records from the user:

    {mood_summary}

    Provide:

    1. A friendly weekly emotional overview.
    2. The frequently recorded moods.
    3. Supportive observations about the recorded patterns.
    4. Three practical wellness suggestions.
    5. An encouraging closing message.

    IMPORTANT:
    - Be empathetic and supportive.
    - Do not diagnose mental health conditions.
    - Do not treat mood records as a clinical assessment.
    - Do not make assumptions about the user's mental health.
    - Respect the user's privacy.
    - Use simple English.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )

        return {"insights": response.text}

    except Exception as error:
        print("WELLNESS INSIGHTS ERROR:", repr(error))

        raise HTTPException(
            status_code=503,
            detail="Unable to generate wellness insights right now."
        )
@app.post("/chat")
def chat(request: ChatRequest):
    if not request.message.strip():
        return {"reply": "Please enter a message."}

    try:
        response = client.models.generate_content(
           model="gemini-3.5-flash-lite",
            contents=f"{SYSTEM_PROMPT}\n\nUser: {request.message}"
        )

        return {"reply": response.text}

    except Exception as error:
        print("GEMINI API ERROR:", repr(error))
        raise HTTPException(
            status_code=503,
            detail="Gemini connection failed. Check backend terminal."
    )