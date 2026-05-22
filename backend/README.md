# Traffic Sign Detection Backend

This backend is a small Node.js API for the user dashboard part of the Traffic Sign Detection system.

It follows a simple layered structure:

```text
routes -> controllers -> services -> data
```

## Run

```bash
cd backend
npm start
```

Server URL:

```text
http://localhost:5000
```

## Main Endpoints

```text
GET  /api/health
POST /api/auth/login
POST /api/chat
GET  /api/admin/model-monitoring?adminEmail=:email
GET  /api/admin/reports?adminEmail=:email
GET  /api/users/:email/dashboard
GET  /api/users/:email/detections
POST /api/users/:email/detections
GET  /api/users/:email/reports
```

## Demo Login

```json
{
  "email": "user@trafficsign.ai",
  "password": "user123"
}
```

## Example Detection Body

```json
{
  "fileName": "road-image.jpg",
  "sign": "Stop Sign",
  "category": "Regulatory",
  "confidence": 96,
  "status": "Completed"
}
```

## Example Chat Body

```json
{
  "message": "What does confidence mean?",
  "user": {
    "email": "user@trafficsign.ai",
    "role": "User"
  }
}
```

The current implementation uses in-memory seed data. Later, the `data/store.js` file can be replaced with a real database layer.
