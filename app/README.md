# NER Studio (Full‑Stack)

A production-minded Named Entity Recognition (NER) web app:

- **Client**: React (Vite) + Tailwind + Framer Motion
- **Server**: Node.js + Express + MongoDB + JWT auth
- **AI Service**: FastAPI + spaCy (Transformer model)

## Folder structure

- `client/` – React UI
- `server/` – Express API
- `ai-service/` – FastAPI NER model service

---

## 1) Local setup (recommended)

### Prereqs

- Node.js 20+
- Python 3.11+
- MongoDB running locally **or** Docker

### AI service

```bash
cd ai-service
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_trf
uvicorn app.main:app --reload --port 8000
```

### Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## 2) Docker Compose (bonus)

```bash
docker compose up --build
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5050/health`
- AI: `http://localhost:8000/health`

---

## Environment variables

### server/.env

- `MONGODB_URI` – e.g. `mongodb://localhost:27017/ner_app`
- `JWT_SECRET` – set to a strong random string
- `LOGIN_CODE_SECRET` – secret used to hash one-time login codes
- `LOGIN_CODE_TTL_MINUTES` – code expiry (default 10)
- `LOGIN_CODE_DELIVERY` – `auto` (SMTP) or `log` (prints code to server logs)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` – optional, for email delivery
- `CLIENT_ORIGIN` – e.g. `http://localhost:5173`
- `AI_SERVICE_URL` – e.g. `http://localhost:8000`

### ai-service/.env

- `SPACY_MODEL` – default `en_core_web_trf` (falls back to `en_core_web_sm` if missing)

### client/.env

- `VITE_API_URL` – default `http://localhost:5050`

---

## API testing guide (curl)

### Signup

```bash
curl -i -X POST http://localhost:5050/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login (stores cookie)

```bash
curl -i -c cookies.txt -X POST http://localhost:5050/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

### Passwordless login (email code)

Request a 6-digit code (in dev with no SMTP configured, the server logs it as `[login-code] you@example.com -> 123456`):

```bash
curl -i -X POST http://localhost:5050/auth/request-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'
```

Verify the code (stores cookie):

```bash
curl -i -c cookies.txt -X POST http://localhost:5050/auth/verify-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","code":"123456"}'
```
```

### Analyze

```bash
curl -i -b cookies.txt -X POST http://localhost:5050/ner/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Barack Obama visited Microsoft in Seattle."}'
```

### History

```bash
curl -i -b cookies.txt http://localhost:5050/user/history
```

### Delete history item

```bash
curl -i -b cookies.txt -X DELETE http://localhost:5050/history/<id>
```
