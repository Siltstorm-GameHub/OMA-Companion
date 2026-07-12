# GuildHub – Discord Companion

Ein Community-Portal für Discord-Server mit Events, Turnierbaum und Punktesystem.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js v5 + Discord OAuth2
- **DB**: Prisma + SQLite (Entwicklung) / PostgreSQL (Produktion)
- **UI**: Tailwind CSS + Lucide Icons

## Schnellstart

### 1. Discord App erstellen

1. Gehe zu https://discord.com/developers/applications
2. Klicke **New Application** → Name vergeben
3. Links auf **OAuth2** → **Client ID** und **Client Secret** kopieren
4. Unter **Redirects** hinzufügen: `http://localhost:3000/api/auth/callback/discord`

### 2. Umgebungsvariablen setzen

```bash
cp .env.example .env.local
```

Trage in `.env.local` ein:
```
DISCORD_CLIENT_ID=deine_client_id
DISCORD_CLIENT_SECRET=dein_client_secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 3. Datenbank aufsetzen

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Öffne http://localhost:3000

## Projektstruktur

```
src/
├── app/
│   ├── (dashboard)/         # Alle geschützten Seiten (Auth required)
│   │   ├── dashboard/       # Übersicht
│   │   ├── events/          # Event-Tabelle + Erstellung
│   │   ├── tournament/      # Turnierbaum
│   │   ├── leaderboard/     # Rangliste
│   │   ├── points/          # Punktesystem-Regeln
│   │   └── profile/         # Eigenes Profil
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Discord OAuth2
│   │   ├── events/          # GET + POST Events
│   │   ├── leaderboard/     # GET Rangliste
│   │   └── profile/         # GET eigenes Profil
│   ├── login/               # Login-Seite
│   └── layout.tsx
├── components/
│   ├── FloatingPill.tsx     # Desktop-Navigation
│   ├── BottomNav.tsx        # Mobile-Navigation
│   └── SessionProvider.tsx  # NextAuth Provider
└── lib/
    ├── prisma.ts            # DB Client (Singleton)
    └── points.ts            # Punkte-Logik + Level-Berechnung
```

## Nächste Schritte

- [ ] Discord Bot (discord.js) für automatisches Punkte-Tracking
- [ ] Event-Erstellungsformular (`/events/new`)
- [ ] Turnierbaum-Generator (Single/Double Elimination)
- [ ] Webhook: Bot postet Ergebnisse in Discord-Kanal
- [ ] Admin-Panel für Moderatoren
- [ ] PostgreSQL für Produktion (Vercel / Railway)
