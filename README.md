# Video Call App

A full-stack video calling app with JWT authentication and peer-to-peer WebRTC video.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, bcryptjs, jsonwebtoken |
| Video | WebRTC (browser-native), STUN via Google |
| Auth | JWT (HS256, 30-min expiry), bcrypt password hashing |

## Features

- Register / Login with hashed passwords
- JWT auth with automatic token refresh on API calls
- Protected routes
- Peer-to-peer video & audio via WebRTC
- Mute / camera toggle during calls
- Room-based calling (share a room ID with a friend)
- Authenticated Socket.IO signaling server

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
npm run dev
```

Server starts at `http://localhost:8000`

**Demo accounts** (auto-created on start):
- `admin` / `admin123`
- `user` / `password123`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # or use the provided .env
npm start
```

App opens at `http://localhost:3000`

---

## How Video Calling Works

1. Click **Video Call** in the dashboard
2. Enter any room ID (e.g. `myroom`)
3. Share that room ID with a friend
4. When they join the same room, a WebRTC peer connection is established directly between browsers
5. The server only handles the initial signaling (offer/answer/ICE) — video traffic is peer-to-peer

> **Note:** Both users must be on the same network, or you need to add a TURN server for NAT traversal in production.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default 8000) |
| `JWT_SECRET` | **Required.** Secret for signing JWTs — use a long random string |
| `CLIENT_ORIGIN` | CORS allowed origin (default `http://localhost:3000`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `REACT_APP_API_BASE_URL` | Backend URL (default `http://localhost:8000`) |

---

## Production Checklist

- [ ] Set a strong, random `JWT_SECRET` (32+ chars)
- [ ] Store secrets in a secrets manager, never in git
- [ ] Replace the in-memory user store with a real database (PostgreSQL, MongoDB, etc.)
- [ ] Add a TURN server for WebRTC NAT traversal (e.g. Coturn, Twilio, Metered)
- [ ] Set `CLIENT_ORIGIN` to your production frontend domain
- [ ] Enable HTTPS (required for WebRTC in browsers)
- [ ] Add rate limiting to `/token` and `/register`
