# Kagua - Track B Core API 🌾

**AI-Powered Farming Assistant Backend for Kenyan Smallholder Farmers**

---

## 📌 About This Project

Track B is the **Core API and Data Layer** for Project Kagua. It handles:
- 👤 User management (farmers)
- 📋 Journey persistence (saving each screen's state)
- 🔌 API endpoints for frontend communication
- 🗄️ Database operations (PostgreSQL)
- 🔗 Integration with Track A (AI Service)

**This is the backend engine that powers the Kagua farming assistant.**

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- PostgreSQL
- Git

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/kagua.git
cd kagua/backend/track-b-core

# 2. Create virtual environment
python -m venv venv

# 3. Activate (Windows)
venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 6. Create database tables
python -c "from app.models.base import Base, engine; Base.metadata.create_all(bind=engine)"

# 7. Run the server
uvicorn app.main:app --reload --port 8000
```

### Test It
Open your browser: `http://127.0.0.1:8000/docs`

You'll see the interactive API documentation (Swagger UI).

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/analyze` | Start a journey - extract crop/problem from voice/text |
| `POST` | `/compare` | Save comparison data to journey |
| `POST` | `/source-details` | Get detailed content from trusted sources |
| `POST` | `/test-user` | Create or retrieve a test user |
| `GET` | `/user/{phone}/journeys` | Get all journeys for a user |
| `GET` | `/journey/{journey_id}` | Get a single journey by ID |
| `PUT` | `/journey/{journey_id}/status` | Update journey status |

---

## 🗂️ Project Structure

```
track-b-core/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Configuration
│   ├── models/              # Database models (User, DecisionJourney)
│   ├── services/            # Business logic
│   ├── stubs/               # Track A mock (for development)
│   └── ...
├── .env                     # Environment variables
├── requirements.txt         # Dependencies
└── INTEGRATION_CHECKLIST.md # Track A integration guide
```

---

## 🔌 Track A Integration

This project uses a **stub** (fake AI) for development. To integrate the real AI:

1. Place the `track-a-ai` folder in `../`
2. Set `USE_REAL_TRACK_A=True` in `.env`
3. Restart the server

```env
USE_REAL_TRACK_A=True
TRACK_A_PATH=../track-a-ai/app
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.10+ |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Server | Uvicorn |
| Migrations | Alembic (future) |

---

## 📦 Key Features

- ✅ **User Management** - Create, retrieve farmers
- ✅ **Journey Tracking** - Save every step of the decision process
- ✅ **Voice-First Ready** - Supports voice input/output (via Track A)
- ✅ **Safety Guardrails** - No harmful recommendations (via Track A)
- ✅ **Scalable** - Designed for all 47 counties, multiple crops
- ✅ **API Documentation** - Auto-generated Swagger UI

---

## 🧪 Testing

Test all endpoints using the Swagger UI at `/docs` or use curl:

```bash
# Test health check
curl http://127.0.0.1:8000/

# Start a journey
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","raw_input":"My maize has yellow leaves","county":"Kiambu","name":"Grace"}'
```

---

## 📖 Documentation

- [Full Track B Documentation](docs/TrackBCoreAPI.docx)
- [Integration Checklist](INTEGRATION_CHECKLIST.md)
- [API Contract](shared/contract.py)

---

## 🤝 Contributing

This is a collaborative project between two developers:

- **Track A**: AI & Knowledge Service
- **Track B**: Core API & Data Layer

Both tracks communicate through a strict JSON contract.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

- Open an issue in this repository
- Check the API docs at `/docs`
- Review the code in `app/`

---

## 🌾 About Project Kagua

Kagua helps smallholder farmers make confident, informed decisions about crop problems — using voice, trusted local knowledge, and balanced perspectives.

**Pilot Scope:** Kiambu County, Kenya  
**Crops:** Maize, Irish Potatoes, Cabbage  
**Languages:** English, Kiswahili  

---

## 🚧 Current Status

**In Development** — Beta ready July-September 2026

---

**Built with ❤️ for Kenya's smallholder farmers**
