import json

from google import genai

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import fitz
from dotenv import load_dotenv
import os




load_dotenv()


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("groqKey"))

@app.get("/")
def home():
    return {"message": "HireFlow AI is running 🚀"}


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):

    # 1. PDF read karo
    pdf_bytes = await file.read()

    # 2. PDF open karo
    document = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
    )

    # 3. PDF se text extract karo
    resume_text = ""

    for page in document:
        resume_text += page.get_text()

    document.close()

    # 4. Gemini ko instruction do
    prompt = f"""
    Analyze the following resume.

    Return ONLY valid JSON with these fields:
    name
    email
    skills
    education
    experience
    projects

    Resume:
    {resume_text}
    """

    # 5. Gemini call
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    # 6. Gemini ka text nikalo
    result = response.text

    # 7. Markdown code fences hatao
    result = result.replace("```json", "")
    result = result.replace("```", "")

    # 8. JSON string → Python dictionary
    candidate = json.loads(result)

    # 9. Result return
    return candidate


from pydantic import BaseModel


class JobDescription(BaseModel):
    job_description: str

@app.post("/match-resume")
async def match_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):

    # PDF read
    pdf_bytes = await file.read()

    # Open PDF
    document = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
    )

    # Extract text
    resume_text = ""

    for page in document:
        resume_text += page.get_text()

    document.close()

    # Gemini prompt
    prompt = f"""
  You are an AI recruitment assistant.

Analyze the candidate's resume against the given job description.

Return ONLY valid JSON.

The JSON MUST follow this exact structure:

{{
    "match_score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "strengths": [],
    "weaknesses": [],
    "recommendation": ""
}}

Rules:

- match_score must be a number between 0 and 100.
- matching_skills MUST be an array of strings.
- missing_skills MUST be an array of strings.
- strengths MUST be an array of strings.
- weaknesses MUST be an array of strings.
- strengths should contain 2-5 concise points.
- weaknesses should contain 2-5 concise points.
- Each strength/weakness should be less than 20 words.
- recommendation MUST be a single string under 50 words.
- Do not return markdown.
- Do not wrap JSON in ```.

    RESUME:
    {resume_text}

    JOB DESCRIPTION:
    {job_description}
    """

    # Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    result = response.text

    # Remove markdown fences
    result = result.replace("```json", "")
    result = result.replace("```", "")

    # JSON → Python dictionary
    match_result = json.loads(result)

    return match_result