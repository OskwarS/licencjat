from fastapi import FastAPI
from pydantic import BaseModel
import os
from google import genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="Vaultify AI Service")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

try:
    if GEMINI_API_KEY and GEMINI_API_KEY != "TWOJ_KLUCZ_AI_WAKLEJ_TUTAJ":
        client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        client = None
except Exception as e:
    client = None

class IncomeData(BaseModel):
    net_income: float
    model: str = '503020'
    expected_raise: float = 0
    smart_allocation: int = 50
    custom_needs: int = 50
    custom_wants: int = 30
    custom_savings: int = 20

class TransactionDesc(BaseModel):
    description: str

@app.post("/calculate")
def calculate_budget(data: IncomeData):
    income = data.net_income
    
    if data.model == 'smart' and data.expected_raise > 0:
        # Model SMarT: bazowy budżet 50/30/20, ale z podwyżki alokujemy % do oszczędności
        raise_savings = data.expected_raise * (data.smart_allocation / 100)
        raise_spending = data.expected_raise - raise_savings
        
        total_income = income + data.expected_raise
        needs = income * 0.50
        wants = income * 0.30 + raise_spending
        savings = income * 0.20 + raise_savings
    elif data.model == 'custom':
        # Model Własny: użytkownik sam decyduje o proporcjach
        total_income = income
        needs = income * (data.custom_needs / 100)
        wants = income * (data.custom_wants / 100)
        savings = income * (data.custom_savings / 100)
    else:
        # Klasyczny model 50/30/20
        total_income = income
        needs = income * 0.50
        wants = income * 0.30
        savings = income * 0.20
    
    return {
        "net_income": income,
        "total_income": total_income,
        "needs": needs,
        "wants": wants,
        "savings": savings,
        "model": data.model
    }

@app.post("/categorize")
def categorize_transaction(data: TransactionDesc):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "TWOJ_KLUCZ_AI_WAKLEJ_TUTAJ":
        return {"category": "needs", "error": "Brak klucza API w env badz zostal on zignorowany przez system"} 
        
    try:
        prompt = f"""
        Jesteś ekspertem ds. budżetu osobistego Vaultify operującym w bezwzględnej metodzie finansów domowych '50/30/20'.
        Twoim jedynym zadaniem jest kategoryzacja, czy podana nazwa transakcji z konta to: 
        1. 'needs' - "Needs" (Absolutnie niezbędne rachunki do przeżycia, codzienne sklepy spożywcze i dyskonty m.in Lidli, Biedronka, Żabka, opłacanie czynszu, paliwo, media) 
        2. 'wants' - "Wants" (Czyste zachcianki, dobra luksusowe, fast-foody m.in KFC i Mcdonald, subskrypcje jak Netflix/Spotify, lunche w drogich kawiarniach typu Starbucks i rozrywki - kina)
        
        Transakcja do oceny otrzymana z banku to: "{data.description}"

        Zwróć TYLKO I WYŁĄCZNIE JEDNO surowe słowo 'needs' lub 'wants'. Nie dopisuj żadnej argumentacji ani formatowania, tylko techniczne słowo.
        """
        
        if client is None:
            return {"category": "needs", "error": "Brak poprawnego klienta AI."}
            
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        ai_result = response.text.strip().lower()
        
        # Wybór najbardziej prawdopodobnej etykiety bez ryzyka złapania słowa 'wants' w zdaniu: 'to nie jest wants'
        if ai_result == "wants":
             return {"category": "wants"}
        elif ai_result == "needs":
             return {"category": "needs"}
        elif "wants" in ai_result and "needs" not in ai_result:
             return {"category": "wants"}
        else:
             return {"category": "needs"}
    except Exception as e:
        return {"category": "needs", "error": str(e)}
