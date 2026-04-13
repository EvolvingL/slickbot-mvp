# SlickBot — AI Receptionist MVP

A working AI receptionist chatbot for small businesses. Scans a website, builds a knowledge model, and handles enquiries 24/7.

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Run
npm start
# → http://localhost:3000
```

---

## Deploy to Railway (Recommended — free tier available)

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY` = your key
   - `ADMIN_PASSWORD` = your chosen password
4. Railway auto-detects Node.js and deploys. Done.

## Deploy to Render (Free tier)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env vars: `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`

## Deploy to any VPS (Ubuntu)

```bash
# On your server:
git clone <your-repo> slickbot && cd slickbot
npm install
cp .env.example .env && nano .env   # add your keys

# Run with PM2 for persistence:
npm install -g pm2
pm2 start server.js --name slickbot
pm2 save && pm2 startup

# Nginx reverse proxy (optional, for custom domain):
# proxy_pass http://localhost:3000;
```

---

## User Flow

1. **Setup** — Paste business URL → Click "Scan Site" (admin login required)
   - Scrapes site content using Cheerio
   - Summarises with Claude Haiku (fast + cheap)
   - Builds knowledge model in `data/config.json`
2. **Launch** → One click → bot goes live
3. **Admin Panel** → Edit services, pricing, hours, greeting anytime → Save & Update Bot
4. **Chat** → Customers interact with Aria (Claude Haiku, ~£0.001/conversation)

---

## QA Testing

- Click **QA Logs** tab → enter admin password
- All customer sessions stored in memory (resets on server restart)
- View full conversation transcripts per session
- Clear all sessions when done testing

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | required |
| `ADMIN_PASSWORD` | Password for admin panel + QA | `slick2024` |
| `PORT` | Server port | `3000` |

---

## Tech Stack

- **Backend**: Node.js + Express
- **AI**: Anthropic Claude Haiku (fast, cheap, ~£0.001/msg)
- **Scraping**: Cheerio (HTML parser)
- **Frontend**: Vanilla HTML/CSS/JS (zero build step)
- **Data**: JSON file (`data/config.json`) — swap for Postgres in v2

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/config` | None | Public config (no password) |
| POST | `/api/admin/login` | None | Returns admin token |
| GET | `/api/admin/config` | Admin | Full config |
| POST | `/api/admin/config` | Admin | Save config |
| POST | `/api/scan` | Admin | Stream website scan (SSE) |
| POST | `/api/chat` | None | Send chat message |
| GET | `/api/admin/sessions` | Admin | QA session logs |
| DELETE | `/api/admin/sessions` | Admin | Clear sessions |

---

## Roadmap (v2)

- [ ] Real Google Business Profile API integration
- [ ] Calendly/Cal.com booking widget
- [ ] Stripe payment links in chat
- [ ] Embeddable `<script>` tag for any website
- [ ] PostgreSQL persistence (replace JSON file)
- [ ] Multi-business / SaaS mode
- [ ] White-label theming per client
