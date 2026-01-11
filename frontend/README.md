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
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run Playwright tests in UI mode
- `npm run test:e2e:headed` - Run tests in headed browser
- `npm run test:e2e:debug` - Run tests in debug mode

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

## E2E Testing

Chord uses Playwright for end-to-end testing with an isolated Docker Compose test environment.

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+

### Running Tests

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Run E2E tests**:
   ```bash
   npm run test:e2e
   ```

   This will:
   - Start Docker Compose test environment (SQL Server, Redis, MinIO, Backend, Frontend)
   - Wait for all services to be healthy
   - Run Playwright tests
   - Stop and clean up Docker Compose environment

3. **Run tests in UI mode** (interactive):
   ```bash
   npm run test:e2e:ui
   ```

4. **Run tests in headed browser** (see browser):
   ```bash
   npm run test:e2e:headed
   ```

5. **Debug tests**:
   ```bash
   npm run test:e2e:debug
   ```

### Test Environment

Tests use `docker-compose.test.yml` which provides:
- Fresh database on each run (no persistent volumes)
- Isolated test environment (separate from development/production)
- All required services (SQL Server, Redis, MinIO, Backend API, Frontend)

### Test Structure

```
frontend/e2e/
├── helpers/
│   ├── test-setup.ts      # Environment setup helpers
│   └── api-helpers.ts     # API helper functions
└── login-guild-message.spec.ts  # Critical flow test
```

### Writing New Tests

1. Create test file in `frontend/e2e/` directory
2. Import test utilities from `./helpers/`
3. Use Playwright API for UI interactions
4. Use API helpers for backend operations (faster than UI)

Example:
```typescript
import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/api-helpers';

test('my test', async ({ page }) => {
  // Register user via API
  const { accessToken } = await registerUser('test@example.com', 'testuser', 'password');
  
  // Test UI flow
  await page.goto('/login');
  await page.fill('input[id="emailOrUsername"]', 'test@example.com');
  // ... rest of test
});
```

### Test Environment Variables

Test environment uses:
- `VITE_API_BASE_URL=http://localhost:5049/api`
- `VITE_SIGNALR_BASE_URL=http://localhost:5049`
- `VITE_PORT=5173`

These are configured in `docker-compose.test.yml` and don't need a `.env.test` file.

## Upcoming Features

- Notification settings UI (per-channel preferences, mute/unmute, browser notification filtering)
- Performance optimizations (code splitting, lazy loading, memoization)
- Production build optimization (bundle size, asset optimization, PWA support)
