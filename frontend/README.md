# Chord Frontend

> **Purpose:** Frontend setup, development scripts, project structure, and UI components.

React + TypeScript frontend for Chord, a Discord-like real-time chat application.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **SignalR Client** - Real-time communication
- **React Hook Form + Zod** - Form validation

## Prerequisites

- Node.js 18+
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# REST API Base URL (must include /api prefix)
VITE_API_BASE_URL=http://localhost:5049/api

# SignalR Base URL (without /api prefix, required)
VITE_SIGNALR_BASE_URL=http://localhost:5049
```

**Important Notes:**

- `VITE_API_BASE_URL` **must include `/api` prefix** (e.g., `http://localhost:5049/api`)
  - This is required because all REST API endpoints are mapped under `/api` route
  - If you omit `/api`, you'll get 404 errors on API calls
- `VITE_SIGNALR_BASE_URL` is required
  - SignalR hubs are mapped at root level (`/hubs/chat`, `/hubs/presence`), not under `/api`
  - **Do not include trailing slash** - hubUrl already starts with `/` (e.g., use `http://localhost:5049` not `http://localhost:5049/`)

### 3. Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── store/           # Redux store
│   ├── lib/             # Utilities & API clients
│   └── hooks/           # Custom React hooks
└── public/              # Static assets
```

## Completed Features

- ✅ File upload UI (upload button, progress bar, preview, attachment components)
- ✅ WebRTC voice integration (LiveKit SFU, audio/video streaming, STUN/TURN)
- ✅ Direct Messages UI (DM channel list, friend requests, DM navigation)
- ✅ Friends system (add, accept, decline, block)
- ✅ Real-time messaging (SignalR integration)
- ✅ Guild and channel management
- ✅ Voice channel presence
- ✅ Message reactions and pinning
- ✅ @Mentions with notifications
- ✅ User presence (online/offline/idle/dnd/invisible)
- ✅ Unread message tracking
- ✅ Role-based permissions UI
- ✅ Guild settings modal

## Upcoming Features

- Notification settings UI (per-channel preferences, mute/unmute, browser notification filtering)
- Audit log frontend UI (guild settings panel)
- Performance optimizations (code splitting, lazy loading, memoization)
- E2E testing (Playwright/Cypress, critical flow tests)
- Production build optimization (bundle size, asset optimization, PWA support)
