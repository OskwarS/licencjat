import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
data_description = "JMP S.A. BIEDRONKA 4880"
prompt = f"""
Jesteś ekspertem ds. budżetu osobistego Vaultify operującym w bezwzględnej metodzie finansów domowych '50/30/20'.
Twoim jedynym zadaniem jest kategoryzacja, czy podana nazwa transakcji z konta to: 
1. 'needs' - "Needs" (Absolutnie niezbędne rachunki do przeżycia, codzienne sklepy spożywcze i dyskonty m.in Lidli, Biedronka, Żabka, opłacanie czynszu, paliwo, media) 
2. 'wants' - "Wants" (Czyste zachcianki, dobra luksusowe, fast-foody m.in KFC i Mcdonald, subskrypcje jak Netflix/Spotify, lunche w drogich kawiarniach typu Starbucks i rozrywki - kina)

Transakcja do oceny otrzymana z banku to: "{data_description}"

Zwróć TYLKO I WYŁĄCZNIE jedno surowe słowo 'needs' lub 'wants'. Nie dopisuj żadnej argumentacji ani formatowania, tylko techniczne słowo.
"""
try:
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=prompt,
    )
    print("RAW RESPONSE:", repr(response.text))
except Exception as e:
    print("EXCEPTION:", str(e))
