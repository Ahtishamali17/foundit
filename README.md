<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=6366f1&height=200&section=header&text=FoundIt&fontSize=80&fontColor=ffffff&fontAlignY=35&desc=Campus%20Lost%20%26%20Found%20Platform&descAlignY=60&descColor=a5b4fc" width="100%"/>

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-Ahtishamali17-6366f1?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Ahtishamali17)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/Ahtishamali17/foundit/pulls)

<br/>

> **FoundIt** is an AI-powered Lost & Found web platform built for college campuses.  
> Students can report lost/found items, get intelligent AI matches, and connect securely — all in one place.

<br/>

**🔴 [Live Demo](https://foundit-niet.vercel.app)** &nbsp;•&nbsp; **📖 [API Docs](#-api-documentation)** &nbsp;•&nbsp; **🐛 [Report Bug](https://github.com/Ahtishamali17/foundit/issues)** &nbsp;•&nbsp; **💡 [Request Feature](https://github.com/Ahtishamali17/foundit/issues)**

<br/>

</div>

---

## 📸 Preview

<div align="center">

| Home Page | Dashboard | Item Detail |
|:---------:|:---------:|:-----------:|
| ![Home](https://via.placeholder.com/380x220/6366f1/ffffff?text=🏠+Home+Page) | ![Dashboard](https://via.placeholder.com/380x220/8b5cf6/ffffff?text=📊+Dashboard) | ![Detail](https://via.placeholder.com/380x220/22d3ee/ffffff?text=📦+Item+Detail) |

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎨 Frontend
- ⚡ **Glassmorphism UI** — frosted glass, dark theme
- 📱 **Fully Responsive** — mobile + desktop
- 🔀 **Multi-step Post Form** — image upload + validation
- 📊 **Live Dashboard** — analytics, My Items, Messages
- 🔍 **Smart Search** — with fuzzy matching (typo-tolerant)
- 💬 **Real-time Chat** — message item owners
- 🔔 **Toast Notifications** — instant feedback
- 🌊 **Animated UI** — word-by-word hero, shimmer gradients

</td>
<td width="50%">

### ⚙️ Backend
- 🔐 **JWT Authentication** — secure login/register
- 🖼 **Image Upload** — Multer (local) or Cloudinary
- 🤖 **AI NLP Matching** — TF-IDF + Cosine Similarity
- 🧠 **Image Similarity** — MobileNet embeddings (optional)
- 💡 **Smart Recommendations** — personalized feed
- 🔎 **Fuzzy Search** — Fuse.js typo handling
- 🗄 **MongoDB** — indexed for speed, geo-ready
- 🔌 **Socket.io** — real-time chat engine

</td>
</tr>
</table>

---

## 🤖 AI / NLP Engine

This is what makes FoundIt stand out from a basic CRUD app:

```
New Item Posted
      │
      ▼
┌─────────────────────────────────────────────┐
│           NLP PIPELINE                       │
│                                             │
│  Text → Lowercase → Tokenize               │
│       → Remove Stopwords                   │
│       → Porter Stemmer                     │
│       → TF-IDF Vectors                     │
│       → Cosine Similarity                  │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────▼────────────┐
      │   COMBINED SCORE        │
      │                         │
      │  Text Sim   × 40%       │
      │  Category   × 25%       │
      │  Date Prox  × 20%       │
      │  Location   × 15%       │
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │  IMAGE SIMILARITY       │
      │  (if TF.js installed)   │
      │  MobileNet Embeddings   │
      │  + Cosine Similarity    │
      └────────────┬────────────┘
                   │
                   ▼
         Matches saved in DB
         Both items notified
```

| Component | Technology | Score Weight |
|-----------|-----------|-------------|
| Text Similarity | TF-IDF + Cosine | 40% |
| Category Match | Exact Match | 25% |
| Date Proximity | Linear Decay (30d) | 20% |
| Location Overlap | Jaccard Similarity | 15% |
| Image Similarity | MobileNet v2 (optional) | Bonus |
| Fuzzy Search | Fuse.js (threshold 0.4) | Search only |

---

## 🏗 Project Structure

```
foundit/
│
├── 📄 index.html                    ← Complete frontend (single file SPA)
├── 📄 .gitignore
├── 📄 README.md
│
└── 📁 backend/
    ├── 📄 server.js                 ← Main Express server + all routes
    ├── 📄 package.json
    ├── 📄 .env.example
    │
    ├── 📁 utils/                    ← 🆕 AI/NLP Modules
    │   ├── 🤖 nlp.js               ← TF-IDF, cosine, fuzzy, keywords
    │   ├── 🤖 aiMatcher.js         ← Matching engine (runs on item post)
    │   ├── 🤖 recommender.js       ← Personalized recommendation feed
    │   └── 🖼 imageSimilarity.js   ← MobileNet image embeddings
    │
    ├── 📁 config/
    │   └── db.js                   ← MongoDB connection
    │
    ├── 📁 models/
    │   ├── User.model.js
    │   ├── Item.model.js           ← Extended with matches[], keywords[], embeddings[]
    │   └── Chat.model.js
    │
    ├── 📁 controllers/
    │   ├── auth.controller.js
    │   ├── item.controller.js
    │   └── chat.controller.js
    │
    ├── 📁 routes/
    │   ├── auth.routes.js
    │   ├── item.routes.js
    │   ├── chat.routes.js
    │   ├── user.routes.js
    │   └── notification.routes.js
    │
    ├── 📁 middleware/
    │   ├── auth.middleware.js
    │   ├── upload.middleware.js
    │   └── validate.middleware.js
    │
    ├── 📁 services/
    │   ├── aiMatching.service.js
    │   ├── cloudinary.service.js
    │   └── email.service.js
    │
    ├── 📁 sockets/
    │   └── chat.socket.js
    │
    └── 📁 uploads/                  ← Auto-created on first run
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

```bash
node --version    # v18.0.0 or higher
npm --version     # v9.0.0 or higher
```

- [Node.js 18+](https://nodejs.org/en/download)
- [MongoDB](https://www.mongodb.com/try/download/compass) (local) or [MongoDB Atlas](https://mongodb.com/atlas) (free cloud)
- [VS Code](https://code.visualstudio.com/) (recommended)
- [Git](https://git-scm.com/downloads)

---

### 📦 Installation

**Step 1 — Clone the repository**

```bash
git clone https://github.com/Ahtishamali17/foundit.git
cd foundit
```

**Step 2 — Setup backend**

```bash
cd backend
npm install
```

**Step 3 — Configure environment**

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Now open `.env` and fill in your values:

```env
# ── Server ──────────────────────────────
NODE_ENV=development
PORT=5000

# ── MongoDB ─────────────────────────────
# Option A: Local MongoDB (if MongoDB Compass installed)
MONGO_URI=mongodb://localhost:27017/foundit

# Option B: MongoDB Atlas (free cloud)
# MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/foundit

# ── JWT ─────────────────────────────────
JWT_SECRET=your_super_secret_key_min_32_chars

# ── Admin ───────────────────────────────
ADMIN_EMAIL=admin@foundit.app

# ── Cloudinary (optional - for cloud image storage) ──
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Step 4 — Start the server**

```bash
npm run dev
```

You should see:

```
╔══════════════════════════════════════════╗
║   FoundIt AI — NIET Noida Campus          ║
╠══════════════════════════════════════════╣
║  🌐 App    : http://localhost:5000         ║
║  ⚙️  API    : http://localhost:5000/api    ║
║  🤖 NLP    : TF-IDF + Cosine + Fuzzy      ║
║  🏥 Health : http://localhost:5000/api/health║
╚══════════════════════════════════════════╝

✅ MongoDB connected!
```

**Step 5 — Open in browser**

```
http://localhost:5000
```

> The frontend (`index.html`) is served automatically by the backend — no separate server needed!

---

### ⚡ Optional: Enable Image AI

For MobileNet-powered image similarity (optional, adds ~500MB):

```bash
npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet jimp
```

The system gracefully works without it — image similarity is simply skipped.

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Create new account |
| `POST` | `/auth/login` | ❌ | Login, get JWT token |
| `GET` | `/auth/me` | ✅ | Get current user |

**Register:**
```json
POST /api/auth/register
{
  "name": "Ahtisham Ali",
  "email": "ahtisham@niet.co.in",
  "password": "password123",
  "college": "NIET Noida",
  "phone": "+91 9876543210"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "_id": "...", "name": "Ahtisham Ali", "email": "ahtisham@niet.co.in" }
}
```

---

### 📦 Items

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/items` | ❌ | Get all items (filter, paginate) |
| `GET` | `/items/mine` | ✅ | Get my items (dashboard) |
| `GET` | `/items/search?q=` | ❌ | 🆕 NLP fuzzy search |
| `GET` | `/items/:id` | ❌ | Get single item |
| `GET` | `/items/:id/matches` | ❌ | 🆕 AI matches for item |
| `POST` | `/items` | ✅ | Post new item (multipart/form-data) |
| `PUT` | `/items/:id` | ✅ | Update item |
| `PUT` | `/items/:id/resolve` | ✅ | Mark as resolved |
| `DELETE` | `/items/:id` | ✅ | Delete item |

**Query Parameters for `GET /api/items`:**

| Param | Type | Example |
|-------|------|---------|
| `type` | string | `lost` or `found` |
| `category` | string | `Electronics` |
| `status` | string | `pending` or `resolved` |
| `search` | string | `headphones` |
| `fuzzy` | boolean | `true` |
| `page` | number | `1` |
| `limit` | number | `12` |

**Create Item (multipart/form-data):**
```
POST /api/items
Authorization: Bearer <token>

Fields:
  title          (required)
  description    (required)
  type           lost | found (required)
  category       (required)
  location       (required)
  date           YYYY-MM-DD (required)
  image          file (optional)
  contactName
  contactEmail
  contactPhone
```

**GET /api/items/:id/matches response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Black Sony Headphones",
      "type": "found",
      "_matchScore": 0.82,
      "_matchImgScore": 74,
      "_matchBreakdown": {
        "text": 78,
        "category": 100,
        "date": 80,
        "location": 60,
        "final": 82
      },
      "_matchReason": "same category, similar description, close date"
    }
  ]
}
```

---

### 🤖 AI & Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/recommendations` | ✅ | 🆕 Personalized item feed |
| `POST` | `/admin/rerun-matching` | ✅ Admin | 🆕 Re-run AI on all items |

**GET /api/recommendations response:**
```json
{
  "success": true,
  "data": [ ...items with _recScore and _recReason ],
  "meta": {
    "total": 8,
    "interestKeywords": ["headphones", "sony", "charger", "electronics"],
    "basedOn": "your activity"
  }
}
```

---

### 📊 Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/stats` | ❌ | Platform-wide counts |
| `GET` | `/health` | ❌ | Server + DB health |

---

## 🗄 Database Schema

### User
```js
{
  name:      String,   // required
  email:     String,   // unique, lowercase
  password:  String,   // bcrypt hashed, never returned
  college:   String,   // default: "NIET Noida"
  phone:     String,
  createdAt: Date,
  updatedAt: Date
}
```

### Item (AI-enhanced)
```js
{
  // Core fields
  title:       String,   // required
  description: String,   // required
  type:        "lost" | "found",
  category:    String,
  status:      "pending" | "resolved",
  image:       String,   // filename
  location:    String,
  date:        Date,
  contact:     { name, email, phone },
  userId:      ObjectId,
  userName:    String,
  views:       Number,

  // 🆕 AI fields
  matches: [{
    itemId:    ObjectId,
    score:     Number,    // 0–1 combined score
    imgScore:  Number,    // 0–100 image similarity %
    breakdown: { text, category, date, location, final },
    reason:    String     // human-readable explanation
  }],
  imageEmbedding: [Number],  // 1024-dim MobileNet vector (hidden from API)
  keywords:       [String]   // auto-extracted NLP keywords
}
```

---

## 🛠 Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JS (Glassmorphism SPA) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Auth** | JWT (JSON Web Tokens), bcryptjs |
| **AI/NLP** | natural (TF-IDF), Fuse.js (fuzzy), custom cosine similarity |
| **Image AI** | TensorFlow.js + MobileNet v2 (optional) |
| **File Upload** | Multer (local) / Cloudinary (cloud) |
| **Real-time** | Socket.io |
| **Dev Tools** | Nodemon, dotenv |

</div>

---

## 🌐 Deployment Guide

### Frontend → GitHub Pages / Netlify

```bash
# Netlify drag-and-drop: just upload index.html
# Or via CLI:
npm install -g netlify-cli
netlify deploy --prod --dir=. --site=YOUR_SITE_ID
```

### Backend → Render (Free)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo → select `backend/` as root
4. Build: `npm install`
5. Start: `npm start`
6. Add Environment Variables from your `.env`

### Database → MongoDB Atlas (Free)

1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free **M0** cluster
3. Database Access → Add user with password
4. Network Access → Allow `0.0.0.0/0`
5. Connect → Drivers → Copy connection string
6. Replace `<password>` and add `/foundit` at end

---

## 🧪 Test the AI

After starting the server, try these:

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahtisham Ali","email":"test@niet.co.in","password":"test1234"}'

# 2. Post a LOST item
curl -X POST http://localhost:5000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Sony WH-1000XM5 Headphones","description":"Black noise-cancelling Sony headphones with white case","type":"lost","category":"Electronics","location":"NIET Main Library","date":"2024-12-28"}'

# 3. Post a FOUND item (AI matching fires automatically)
curl -X POST http://localhost:5000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Found black Sony headphones","description":"Sony noise cancelling headphones found near library","type":"found","category":"Electronics","location":"NIET Library 2nd floor","date":"2024-12-28"}'

# 4. Check AI matches (wait 1-2 seconds for async matching)
curl http://localhost:5000/api/items/ITEM_ID/matches

# 5. Fuzzy search (typo test!)
curl "http://localhost:5000/api/items/search?q=headfones"
curl "http://localhost:5000/api/items/search?q=soni+headphone"
```

---

## 🔒 Security Features

- ✅ **JWT** — stateless auth with 7-day expiry
- ✅ **bcrypt** — 12 salt rounds password hashing
- ✅ **CORS** — configurable origin whitelist
- ✅ **Input validation** — all POST/PUT routes
- ✅ **File type check** — Multer rejects non-images
- ✅ **Password hidden** — `select: false` on schema
- ✅ **Error handling** — global Express error handler
- ✅ **No sensitive data in responses** — clean JSON

---

## 📈 Roadmap

- [x] JWT Authentication
- [x] Lost & Found CRUD
- [x] Image Upload
- [x] NLP Text Matching (TF-IDF + Cosine)
- [x] Fuzzy Search
- [x] Smart Recommendations
- [x] Real-time Chat (Socket.io)
- [ ] Email Notifications (Nodemailer)
- [ ] Google OAuth Login
- [ ] Push Notifications (FCM)
- [ ] Admin Panel
- [ ] PWA Support
- [ ] Mobile App (React Native)

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/foundit.git

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Make changes & commit
git add .
git commit -m "feat: add amazing feature"

# 5. Push & open PR
git push origin feature/amazing-feature
```

Please follow [conventional commits](https://www.conventionalcommits.org/) format.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

<div align="center">

<img src="https://avatars.githubusercontent.com/Ahtishamali17" width="100" style="border-radius:50%"/>

### Ahtisham Ali

*Full Stack Developer | NIET Noida*

[![GitHub](https://img.shields.io/badge/GitHub-Ahtishamali17-6366f1?style=flat-square&logo=github)](https://github.com/Ahtishamali17)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/ahtishamali17)
[![Email](https://img.shields.io/badge/Email-ahtisham@niet.co.in-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:theali0017@gmai.com)

</div>

---

## ⭐ Support

If this project helped you or you think it's cool — **please give it a star!** ⭐

It helps others discover the project and motivates continued development.

[![Star History](https://img.shields.io/github/stars/Ahtishamali17/foundit?style=social)](https://github.com/Ahtishamali17/foundit/stargazers)

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=6366f1&height=100&section=footer" width="100%"/>

*Built with ❤️ for NIET Noida Campus — by [Ahtisham Ali](https://github.com/Ahtishamali17)*

</div>
