# ShamsReferalBot

Telegram referral bot. Vertical Slice Architecture, Express, TypeORM, TypeScript.

## Stack

- **Language:** TypeScript
- **Bot framework:** Telegraf (Telegram Bot API client)
- **HTTP:** Express (health check now, ready for webhook mode / future API routes)
- **ORM:** TypeORM with the `sqljs` (pure-JS SQLite) driver — no native build tools required on Windows
- **Architecture:** Vertical Slice — each feature owns its handler(s)/logic under `src/features/<feature>`

## Structure

```
src/
  config/
    env.ts            env vars
    data-source.ts     TypeORM DataSource
  bot/
    bot.ts             wires all feature handlers into the Telegraf bot
  features/
    users/             shared User entity + service (used by all slices below)
    start/              /start command + main menu keyboard
    register/           "Ro'yxatdan o'tish" flow (asks for ism-familiya, saves it)
    referral/            "Do'stingizni taklif qiling" flow (generates referral link)
  app.ts               Express app
  server.ts            entry point: connects DB, starts Express, launches bot
```

Adding a new feature = adding a new folder under `src/features` and registering its handler in `src/bot/bot.ts`. Nothing else to touch.

## Setup

```
npm install
npm run dev
```

Bot token and other config live in `.env` (already set to the token you gave me). `database.sqlite` is created automatically on first run.

## Behavior

1. `/start` → replies with "✅ Assalomu alaykum, botimizga xush kelibsiz!" and two buttons:
   - 🤝 Do'stingizni taklif qiling → sends the user's personal referral link (`https://t.me/ShamsReferal_bot?start=<id>`) and how many people they've invited.
   - 📝 Ro'yxatdan o'tish → asks for ism va familiya; next text message from that user is saved and answered with "Xush kelibsiz, <Ism Familiya>!"
2. If someone opens the bot via a referral link, their inviter's Telegram ID is stored on their user row (`referredBy`), so invite counts stay accurate.

## Scripts

- `npm run dev` — run with ts-node-dev (auto-reload)
- `npm run build` — compile to `dist/`
- `npm start` — run compiled build
