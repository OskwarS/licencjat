import os
from google import genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    models = list(client.models.list())
    for m in models:
        print(m.name)
except Exception as e:
    print(f"Error fetching: {e}")
