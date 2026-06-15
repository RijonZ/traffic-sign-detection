# Traffic Sign Detection System

A full-stack web application for automated traffic sign recognition, built as a final-year university project. The system combines a React frontend, a Node.js REST API, a Python machine learning service, and a CockroachDB cloud database to provide an end-to-end detection pipeline — from image upload to classified result.

---

## Overview

The motivation behind this project was to explore how a convolutional neural network trained on real-world traffic sign data can be integrated into a production-style web application, rather than remaining as an isolated notebook experiment. The result is a multi-role platform where users upload road images, the system classifies the traffic sign, and the outcome is stored, audited, and reported across a role-based dashboard hierarchy.

The ML model was trained separately on the GTSRB (German Traffic Sign Recognition Benchmark) dataset using TensorFlow/Keras and achieves classification across 43 sign categories. It is served through a lightweight Flask microservice that accepts base64-encoded images and returns a prediction with a confidence score.

---

## Architecture

The system runs as three independent processes:

```
Frontend  (React + Vite)          →  port 5173
Backend   (Node.js / Express)     →  port 5000
ML Service (Flask / TensorFlow)   →  port 5001
```

The frontend communicates exclusively with the Node.js backend. The backend forwards image data to the Python service for inference, applies the confidence threshold configured in the admin settings, and stores the result in the database. This separation means the ML service can be restarted or swapped without touching the application layer.

```
Browser
  │
  ▼
React (Vite)
  │  REST + WebSocket (Socket.io)
  ▼
Node.js / Express
  ├── CockroachDB   (PostgreSQL-compatible, cloud)
  ├── Upstash Redis (rate limiting, caching)
  └── Flask / TensorFlow  (sign classification)
```

Real-time updates — new detections, notifications — are pushed to connected clients via Socket.io without requiring page refreshes.

---

## Features

### Detection pipeline

Users upload an image through the Detect Sign page. The backend validates the file, encodes it as base64, and sends it to the ML service. The Flask service applies a center-crop, resizes to 32×32 pixels, normalises pixel values, and runs inference. If the model's confidence meets or exceeds the threshold set by the administrator in Settings, the predicted sign is recorded. If not, the result is stored as "Not detected" and the user is informed of the exact confidence gap.

### Role-based access

Three roles govern what each user can see and do:

- **User** — upload images, view personal detection history, download PDF reports, manage subscription, submit feedback, use the AI chat assistant.
- **Manager** — access platform-wide analytics, export detection data as CSV or JSON, review all reports and detections across the system.
- **Administrator** — full access to all of the above, plus user management, audit logs, model monitoring, system settings, and the admin dashboard.

### Subscription and rate limiting

Users on the Basic plan are limited to three detections per calendar month, enforced through Upstash Redis counters. When the limit is reached, the detection is rejected and both the user and administrators receive a notification. Premium and Team plan users have no detection limit.

### Notifications

Every significant event — completed detection, rejected upload, limit reached, new user registration — generates a notification. Notifications are stored in the database and delivered in real time via WebSocket to the relevant users and roles.

### AI chat assistant

A chat widget is available on all pages. It uses the OpenAI API (GPT-4.1-mini) with the full conversation history passed as context, so follow-up questions work naturally. When the API is unavailable, a built-in fallback handles common questions locally. The assistant responds in the same language the user writes in (Albanian or English).

### Audit logging

All administrative actions are recorded in an audit log table with the user, action type, affected entity, and timestamp. Administrators can filter and review the full history from the Audit Logs page.

### Reporting and export

Users can download a PDF report for any completed detection. Managers and administrators can export the full detection dataset as CSV or JSON from the Export Data page.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Socket.io-client |
| Backend | Node.js, Express 5, Socket.io |
| Database | CockroachDB (PostgreSQL-compatible) |
| Cache / Rate limiting | Upstash Redis |
| ML inference | Python 3, Flask, TensorFlow 2, Pillow |
| Authentication | JWT (access + refresh tokens), bcrypt |
| Payments | Stripe |
| Email | Nodemailer (Gmail), SendGrid |
| PDF generation | PDFKit |
| AI chat | OpenAI API (GPT-4.1-mini) |

---

## Project structure

```
traffic-sign-detection/
├── frontend/
│   └── src/
│       ├── pages/         # 20 page components
│       ├── shared/        # Navbar, ChatBot, Pagination
│       ├── context/       # Global app state
│       ├── socket/        # Socket.io client
│       └── styles/        # Per-page CSS files
│
├── backend/
│   ├── src/
│   │   ├── routes/        # API route definitions
│   │   ├── controllers/   # Request/response handling
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Database queries
│   │   ├── db/            # PostgreSQL and Redis clients
│   │   └── socket/        # WebSocket manager
│   ├── migrations/        # SQL migration files
│   ├── docs/              # OpenAPI spec, Swagger UI, Postman collection
│   └── ml_service/        # Python Flask inference service
│       ├── app.py
│       └── requirements.txt
│
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- A CockroachDB cluster (or any PostgreSQL-compatible database)
- Upstash Redis account
- OpenAI API key (optional — fallback replies work without it)

### Environment variables

Create a `.env` file inside the `backend/` directory with the following values:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=verify-full
JWT_ACCESS_SECRET=<random-secret>
JWT_REFRESH_SECRET=<random-secret>
UPSTASH_REDIS_REST_URL=https://<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
OPENAI_API_KEY=<your-openai-key>
STRIPE_SECRET_KEY=<your-stripe-key>
GMAIL_USER=<your-gmail>
GMAIL_APP_PASSWORD=<your-app-password>
ML_SERVICE_URL=http://localhost:5001
APP_BASE_URL=http://localhost:5173
```

### Database

Run the migration files in order against your database:

```bash
psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/migrations/002_additional_tables.sql
psql $DATABASE_URL -f backend/migrations/002_seed_permissions.sql
psql $DATABASE_URL -f backend/migrations/003_profile_cooldowns.sql
psql $DATABASE_URL -f backend/migrations/004_password_reset_tokens.sql
```

### ML service

```bash
cd backend/ml_service
pip install -r requirements.txt
python app.py
```

The service expects the trained Keras model at the path defined by the `MODEL_PATH` environment variable. The model must be a `.keras` file trained on 43-class GTSRB data with 32×32×3 RGB input.

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## ML model

The classifier was trained on the GTSRB dataset using a convolutional neural network in TensorFlow/Keras. Input images are preprocessed by center-cropping to a square, resizing to 32×32 pixels, and normalising pixel values to the [0, 1] range before inference.

The model covers 43 sign categories including speed limits (20–120 km/h), prohibition signs (no entry, no overtaking), mandatory direction signs, and warning signs (pedestrian crossings, road works, sharp bends). The confidence threshold — the minimum score required to accept a prediction — is configurable per deployment through the admin Settings page and enforced server-side on every request.

---

## API documentation

Interactive documentation is available via Swagger UI at `backend/docs/swagger.html`. A Postman collection is included at `backend/docs/postman_collection.json`.

Key endpoints:

```
POST  /api/auth/login
POST  /api/auth/signup
POST  /api/detect-sign
GET   /api/detect-sign?userEmail=:email
GET   /api/users/:email/dashboard
GET   /api/admin/dashboard?adminEmail=:email
GET   /api/admin/detections?adminEmail=:email
GET   /api/admin/model-monitoring?adminEmail=:email
POST  /api/chat
GET   /api/health
```

---

## Demo accounts

```
Administrator   admin@trafficsign.ai      admin123
Manager         manager@trafficsign.ai    manager123
User            user@trafficsign.ai       user123
```

---

## License

This project was developed as part of a university final-year programme and is intended for academic and educational use.
