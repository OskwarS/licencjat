<div align="center">

# 💰 Vaultify

**Personal Finance Assistant — budżetowanie 50/30/20 wspomagane przez AI**

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)

*Aplikacja mobilna pomagająca zarządzać domowym budżetem w oparciu o metodę 50/30/20, z automatyczną kategoryzacją wydatków przez Google Gemini AI.*

</div>

---

## ✨ Funkcjonalności

| Funkcja | Opis |
|---|---|
| 📊 **Safe-to-Spend** | Jednozdaniowy wskaźnik pokazujący ile możesz dziś wydać na zachcianki |
| 📅 **Dzienny limit (Daily Allowance)** | Automatyczne przeliczanie budżetu w oparciu o datę wypłaty |
| 🤖 **Kategoryzacja AI** | Gemini 2.5 Pro klasyfikuje transakcje jako *needs* lub *wants* |
| 📂 **Import CSV** | Wczytywanie wyciągów bankowych PKO BP w formacie CSV (z obsługą Win-1250) |
| 💳 **Tracker subskrypcji** | Śledzenie kosztów stałych i cyklicznych opłat po słowach kluczowych |
| 🎯 **Cele oszczędnościowe** | Definiowanie i monitorowanie postępu celów finansowych |
| 🧠 **3 modele oszczędnościowe** | Klasyczny 50/30/20, SMarT (z podwyżek) i własny (custom) |
| ⏰ **Synchronizacja Cron** | Automatyczne pobieranie transakcji co godzinę |

---

## 🏗️ Architektura

```
┌─────────────────────┐         ┌──────────────────────┐         ┌────────────────────────┐
│   📱 Mobile App     │  HTTP   │  🟢 Node.js Backend  │  HTTP   │  🐍 Python AI Service  │
│  React Native/Expo  │◄───────►│  Express + SQLite    │◄───────►│  FastAPI + Gemini API  │
│  NativeWind / TS    │         │     Port 3000         │         │      Port 8000          │
└─────────────────────┘         └──────────────────────┘         └────────────────────────┘
```

Projekt oparty na **architekturze mikroserwisowej**:
- **Aplikacja mobilna** — warstwa prezentacji, komunikuje się z backendem przez REST API
- **Backend Node.js** — główny orkiestrator: zarządza danymi, obsługuje endpointy, pośredniczy między bazą a AI
- **Mikroserwis Python** — wydzielona logika obliczeniowa i integracja z Google Gemini

---

## 🛠️ Stack technologiczny

### 📱 Mobile (`/mobile`)
- **React Native 0.81** + **Expo SDK 54**
- **TypeScript**
- **Expo Router** — nawigacja plikowa (file-based routing)
- **NativeWind 4** — Tailwind CSS dla React Native
- **React Native Reanimated** — animacje
- **Axios** — zapytania HTTP

### 🟢 Backend Node.js (`/backend-node`)
- **Node.js** + **Express 5**
- **SQLite3** — lekka baza danych (plik `vaultify.db`)
- **node-cron** — harmonogram synchronizacji transakcji
- **csv-parser** + **iconv-lite** — parsowanie wyciągów bankowych z kodowania Win-1250
- **Axios** — komunikacja z mikroserwisem AI
- **dotenv** — zarządzanie zmiennymi środowiskowymi

### 🐍 Backend AI (`/backend-ai`)
- **Python 3.11+**
- **FastAPI** + **Uvicorn** — serwer REST API
- **Pydantic** — walidacja danych wejściowych
- **google-genai** — oficjalny SDK Google Gemini
- **python-dotenv** — konfiguracja przez `.env`

---

## 🚀 Uruchomienie

### Wymagania wstępne

- [Node.js 18+](https://nodejs.org)
- [Python 3.11+](https://python.org)
- [Expo Go](https://expo.dev/go) na telefonie **lub** emulator Android/iOS
- Klucz API Google Gemini → [ai.google.dev](https://ai.google.dev)

---

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/OskwarS/vaultify.git
cd vaultify
```

---

### 2. Konfiguracja mikroserwisu AI

```bash
cd backend-ai

# Utwórz wirtualne środowisko
python -m venv venv

# Aktywuj (Windows)
.\venv\Scripts\activate

# Zainstaluj zależności
pip install -r requirements.txt
```

Utwórz plik `.env` w folderze `backend-ai/`:

```env
GEMINI_API_KEY=twoj_klucz_api_gemini
```

---

### 3. Konfiguracja backendu Node.js

```bash
cd backend-node
npm install
```

Opcjonalnie utwórz plik `.env` w folderze `backend-node/`:

```env
PORT=3000
AI_SERVICE_URL=http://localhost:8000
```

---

### 4. Konfiguracja aplikacji mobilnej

```bash
cd mobile
npm install
```

---

### ⚡ Szybki start (wszystkie serwisy naraz)

W **głównym folderze projektu** uruchom skrypt startowy:

```bash
# Windows
start_vaultify.bat
```

Skrypt automatycznie uruchamia trzy okna terminala:
- 🐍 Python AI Service → `http://localhost:8000`
- 🟢 Node.js Backend → `http://localhost:3000`
- 📱 Expo Dev Server → zeskanuj QR kod w aplikacji Expo Go

---

### 🔧 Uruchomienie manualne (osobno)

```bash
# Terminal 1 — Python AI
cd backend-ai
.\venv\Scripts\activate
uvicorn main:app --port 8000 --reload

# Terminal 2 — Node.js
cd backend-node
node index.js

# Terminal 3 — Expo
cd mobile
npx expo start
```

---

## 📁 Struktura projektu

```
vaultify/
├── 📱 mobile/                  # Aplikacja React Native
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Ekran główny (Dashboard / Safe-to-Spend)
│   │   │   └── explore.tsx     # Ekran historii transakcji
│   │   └── profile.tsx         # Ekran profilu i ustawień
│   ├── components/             # Komponenty wielokrotnego użytku
│   └── package.json
│
├── 🟢 backend-node/            # Główny backend Node.js
│   ├── index.js                # Serwer Express + wszystkie endpointy REST
│   ├── db.js                   # Inicjalizacja SQLite + schemat tabel
│   ├── banking.js              # Synchronizacja transakcji + cron jobs
│   ├── importCSV.js            # Parser wyciągów bankowych CSV
│   └── package.json
│
├── 🐍 backend-ai/              # Mikroserwis Python
│   ├── main.py                 # FastAPI: /calculate + /categorize
│   ├── requirements.txt
│   └── .env                    # GEMINI_API_KEY (nie commitować!)
│
├── start_vaultify.bat          # Skrypt uruchamiający wszystkie serwisy
└── README.md
```

---

## 🔌 API Reference

### Node.js Backend (`localhost:3000`)

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/user/:id` | Pobierz profil użytkownika |
| `PUT` | `/api/user/:id` | Aktualizuj profil i model oszczędnościowy |
| `GET` | `/api/budget/status/:userId` | Pobierz Safe-to-Spend i dzienny limit |
| `GET` | `/api/transactions/:userId` | Historia transakcji |
| `POST` | `/api/transactions` | Dodaj transakcję (z opcjonalną kategoryzacją AI) |
| `GET` | `/api/fixed-costs/:userId` | Lista kosztów stałych |
| `POST` | `/api/fixed-costs` | Dodaj koszt stały (słowo kluczowe) |
| `DELETE` | `/api/fixed-costs/:id` | Usuń koszt stały |
| `GET` | `/api/savings-goals/:userId` | Lista celów oszczędnościowych |
| `POST` | `/api/savings-goals` | Utwórz nowy cel |
| `PUT` | `/api/savings-goals/:id` | Aktualizuj postęp celu |
| `DELETE` | `/api/savings-goals/:id` | Usuń cel |
| `POST` | `/api/banking/sync/:userId` | Ręczna synchronizacja transakcji |

### Python AI Service (`localhost:8000`)

| Metoda | Endpoint | Opis |
|---|---|---|
| `POST` | `/calculate` | Oblicz podział budżetu 50/30/20 / SMarT / Custom |
| `POST` | `/categorize` | Sklasyfikuj transakcję jako *needs* lub *wants* przez Gemini |

> Interaktywna dokumentacja API dostępna pod `http://localhost:8000/docs` (Swagger UI generowany automatycznie przez FastAPI)

---

## 🧠 Modele oszczędnościowe

| Model | Opis |
|---|---|
| **50/30/20** | Klasyczny podział: 50% potrzeby, 30% zachcianki, 20% oszczędności |
| **SMarT** | Bazowy 50/30/20 + wybrany % przyszłej podwyżki trafia do oszczędności |
| **Custom** | Użytkownik samodzielnie definiuje proporcje (needs/wants/savings) |

---

## 📄 Licencja

Projekt stworzony jako praca licencjacka. Kod dostępny do wglądu.
