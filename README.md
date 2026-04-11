# FoundIt — Campus Lost & Found Platform

> A production-grade, startup-level Lost & Found platform for college campuses.
> Built with Next.js · Node.js · MongoDB · Socket.io · Cloudinary

---

## 🏗️ Project Structure

```
foundit/
├── index.html                    ← Standalone demo (open in browser, no build needed)
│
├── backend/                      ← Node.js + Express API
│   ├── server.js                 ← Entry point
│   ├── package.json
│   ├── .env.example              ← Copy to .env and fill values
│   ├── config/
│   │   └── db.js                 ← MongoDB connection
│   ├── models/
│   │   ├── User.model.js         ← User schema (JWT auth, roles)
│   │   ├── Item.model.js         ← Item schema (text + geo indexes)
│   │   └── Chat.model.js         ← Conversation + Message schemas
│   ├── controllers/
│   │   ├── auth.controller.js    ← Register, login, password reset
│   │   ├── item.controller.js    ← CRUD + AI matching trigger
│   │   └── chat.controller.js    ← Conversation + message REST API
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── item.routes.js
│   │   ├── chat.routes.js
│   │   ├── user.routes.js
│   │   └── notification.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js    ← JWT protect + role authorize
│   │   ├── upload.middleware.js  ← Multer (memory storage)
│   │   └── validate.middleware.js← express-validator rules
│   ├── services/
│   │   ├── aiMatching.service.js ← Keyword + title + date matching
│   │   ├── cloudinary.service.js ← Image upload/delete
│   │   └── email.service.js      ← Nodemailer HTML templates
│   ├── sockets/
│   │   └── chat.socket.js        ← Socket.io real-time chat handler
│   └── utils/
│       └── seed.js               ← Sample data seeder
│
└── README.md                     ← This file
```

---

## ⚡ Quick Start (Demo)

The `index.html` in the root is a **fully self-contained demo** — just open it in any browser:

```bash
open index.html
# or double-click it in your file explorer
```

No build step, no dependencies. Full UI including:
- Landing page with animated gradient + live counter
- Lost & Found item feeds with filters
- Multi-step Post Item form with image preview
- Item detail modal with AI match panel
- Real-time-style chat overlay
- Dashboard with analytics
- Login / Signup flow with toast notifications

---

## 🚀 Full Stack Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier: 25GB storage)
- SMTP credentials (Mailtrap for dev, SendGrid for prod)

### 1. Clone & Install Backend

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
| Variable | Where to get it |
|---|---|
| `MONGO_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Connect → Drivers |
| `JWT_SECRET` | Any 32+ char random string |
| `CLOUDINARY_*` | [Cloudinary Console](https://cloudinary.com/console) |
| `SMTP_*` | [Mailtrap](https://mailtrap.io) (dev) or SendGrid (prod) |

### 3. Seed Sample Data

```bash
npm run seed
# Outputs test credentials
```

### 4. Start Backend

```bash
npm run dev    # Development (nodemon auto-reload)
npm start      # Production
```

API running at: `http://localhost:5000/api`
Health check: `http://localhost:5000/api/health`

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| PUT | `/api/auth/reset-password/:token` | — | Reset password |
| PUT | `/api/auth/update-password` | ✅ | Change password |

### Items

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/items` | — | List items (search, filter, paginate) |
| GET | `/api/items/:id` | — | Get single item |
| POST | `/api/items` | ✅ | Create item (multipart/form-data) |
| PUT | `/api/items/:id` | ✅ | Update item (owner only) |
| DELETE | `/api/items/:id` | ✅ | Delete item (owner only) |
| PUT | `/api/items/:id/resolve` | ✅ | Mark as resolved |
| GET | `/api/items/my-items` | ✅ | Get user's own items |
| GET | `/api/items/:id/matches` | ✅ | Get AI match results |

**Query Parameters for GET /api/items:**
```
type=lost|found
category=Electronics|Bags|...
status=pending|resolved
search=headphones          ← Full-text search
location=Library
lat=28.6139&lng=77.2090&radius=2000   ← Geo proximity (meters)
page=1&limit=12
sortBy=createdAt&sortOrder=desc
```

**Create Item (POST /api/items):**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  title, description, type, category
  locationName, lat, lng, date
  contact[name], contact[email], contact[phone]
  image (file, optional)
```

### Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/chat/conversation` | ✅ | Get or create conversation |
| GET | `/api/chat` | ✅ | Get all user conversations |
| GET | `/api/chat/:id/messages` | ✅ | Get paginated messages |
| POST | `/api/chat/:id/messages` | ✅ | Send a message |

### Users (Admin)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:id` | — | Public profile |
| PUT | `/api/users/me` | ✅ | Update own profile |
| GET | `/api/users` | 🔐 Admin | List all users |
| DELETE | `/api/users/:id` | 🔐 Admin | Delete user |

### Response Format

All responses follow:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 87,
    "pages": 8
  }
}
```

Errors:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Valid email required" }]
}
```

---

## 🔌 Socket.io Events

Connect with: `io('http://localhost:5000', { auth: { token: '<JWT>' } })`

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_conversation` | `conversationId` | Join a chat room |
| `leave_conversation` | `conversationId` | Leave a chat room |
| `send_message` | `{ conversationId, text }` | Send a message |
| `typing` | `conversationId` | Typing indicator |
| `stop_typing` | `conversationId` | Stop typing indicator |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | Message object | New chat message |
| `typing` | `{ userId, name, conversationId }` | Someone is typing |
| `stop_typing` | `{ userId, conversationId }` | Someone stopped typing |
| `new_item` | Item object | New item posted (global) |
| `user_online` | `{ userId, name }` | User came online |
| `user_offline` | `{ userId }` | User went offline |

---

## 🤖 AI Matching Algorithm

The matching engine in `services/aiMatching.service.js` scores each candidate item:

| Component | Weight | Method |
|---|---|---|
| Title similarity | 35% | Levenshtein distance (normalized) |
| Description keywords | 35% | Jaccard similarity on extracted keywords |
| Category match | 20% | Exact match (1 or 0) |
| Date proximity | 10% | Linear decay over 30 days |

Items scoring above **0.30** are surfaced as potential matches. The algorithm runs asynchronously after item creation and updates `item.aiMatches` in the database.

**To upgrade to production-grade AI matching:**
Replace keyword extraction with OpenAI text embeddings and store vectors in Pinecone or MongoDB Atlas Vector Search for semantic similarity at scale.

---

## 🚀 Deployment

### Backend → Render (Free Tier)

1. Push your backend to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo → select `backend/` as root
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all `.env` variables in Render's Environment section

### Database → MongoDB Atlas

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user
3. Whitelist `0.0.0.0/0` (all IPs) for Render's dynamic IPs
4. Copy the connection string into `MONGO_URI`

### Frontend Demo → GitHub Pages / Netlify

The `index.html` is a standalone SPA — deploy it directly:

```bash
# Netlify CLI
netlify deploy --prod --dir=. --site=your-site-id
```

Or drag-and-drop into Netlify's dashboard.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a strong, random `JWT_SECRET` (32+ chars)
- [ ] Enable MongoDB Atlas network access controls
- [ ] Set up Cloudinary signed uploads
- [ ] Configure production SMTP (SendGrid/Resend)
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Add `FRONTEND_URL` to match your deployed frontend domain
- [ ] Run `npm audit` and fix vulnerabilities

---

## 🔐 Security Features

- **JWT Authentication** — stateless, signed tokens with expiry
- **bcrypt password hashing** — 12 salt rounds
- **Rate limiting** — 100 req/15min general, 20 req/15min auth
- **Helmet.js** — sets security-related HTTP headers
- **CORS** — restricted to known frontend origin
- **Input validation** — express-validator on all POST/PUT routes
- **File type validation** — Multer rejects non-image uploads
- **MongoDB injection protection** — Mongoose sanitizes queries
- **Password never returned** — `select: false` on password field
- **Role-based access** — user/admin middleware guards

---

## 🧪 Sample Test Data

After running `npm run seed`:

| Email | Password | Role |
|---|---|---|
| aryan@iit.ac.in | password123 | User |
| priya@bits.ac.in | password123 | User |
| rohan@nit.ac.in | password123 | User |
| admin@foundit.app | adminpass123 | Admin |

8 sample items (mixed lost/found, various categories and statuses).

---

## 🎯 Future Enhancements

- **OpenAI Embeddings** for semantic item matching
- **Google OAuth** — social login integration
- **Push Notifications** — FCM for mobile
- **Image Recognition** — Cloudinary AI tags for auto-categorization
- **Geofencing alerts** — notify nearby users of relevant items
- **Admin Panel** — full item/user management dashboard
- **PWA** — offline support + home screen install
- **Email verification** — verify college email on signup

---

Built with ❤️ by the FoundIt Team. Star ⭐ if this helped!
http://127.0.0.1:5500/