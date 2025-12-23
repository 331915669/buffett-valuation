# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Buffett Valuation is a React-based web application that calculates enterprise intrinsic value using Warren Buffett's Discounted Cash Flow (DCF) methodology, enhanced with AI-powered investment analysis via Google Gemini.

## Development Commands

```bash
# Start development server (Vite dev server with HMR)
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Three-Layer Security Architecture

The application uses a **proxy pattern** to protect API credentials:

1. **Frontend** (`src/App.jsx`): User interface that never handles API keys
2. **API Proxy** (`api/generate.js`): Vercel Serverless Function that forwards requests
3. **External API**: Google Gemini API (accessed only from backend)

**Critical**: API keys are stored in environment variables (`VITE_GEMINI_API_KEY`) and accessed server-side via `process.env` in the Vercel function. The frontend calls `/api/generate`, which proxies to Google's API.

### Core Application Flow

```
User adjusts parameters → DCF calculation (useMemo) → Display results
                       ↓
              Click "AI Analysis" button
                       ↓
         POST /api/generate (frontend)
                       ↓
    api/generate.js reads process.env.VITE_GEMINI_API_KEY
                       ↓
         Forwards to Google Gemini API
                       ↓
              Returns AI commentary
```

### Key Components

**`src/App.jsx`** - Main application component containing:
- **DCF Valuation Logic** (lines 26-61): Two-stage DCF model
  - Stage 1: High-growth period (10 years)
  - Stage 2: Terminal value with perpetual growth
  - Formula: `Total Value = PV(Stage1) + PV(Terminal Value)`
  - **Constraint**: Perpetual growth rate must be < discount rate

- **AI Integration** (lines 64-116):
  - `fetchBuffettOpinion()`: Calls `/api/generate` proxy endpoint
  - Retry logic: 5 attempts with exponential backoff
  - System prompt: Instructs AI to respond as Warren Buffett

- **State Management**:
  - `params`: DCF input parameters (FCF, growth rates, discount rate)
  - `deepReport`: AI analysis result
  - `isAnalyzing`: Loading state
  - `valuation`: Computed DCF results (memoized)

- **UI Components**:
  - `FcfInput`: Custom dual-mode input (slider + direct edit) with non-linear scaling
  - `ParamSlider`: Generic parameter slider component

**`api/generate.js`** - Vercel Serverless Function:
- Only accepts POST requests
- Reads `VITE_GEMINI_API_KEY` from environment
- Forwards request body to Google Gemini API (`gemini-2.5-flash-preview-09-2025` model)
- Returns response directly to client

### DCF Calculation Details

The valuation is memoized and recalculates only when parameters change:

```javascript
// Stage 1: 10-year high growth period
for (let t = 1; t <= 10; t++) {
  currentFcf *= (1 + g);
  PV = currentFcf / Math.pow(1 + r, t);
  stage1Sum += PV;
}

// Stage 2: Terminal value
terminalValue = (FCF_year10 * (1 + perpetualGrowth)) / (r - perpetualGrowth);
discountedTV = terminalValue / Math.pow(1 + r, 10);

// Final intrinsic value
total = stage1Sum + discountedTV;
safetyPrice = total * 0.7;  // 30% margin of safety
```

### Technology Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4 (using `@tailwindcss/postcss`)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel (configured for serverless functions in `/api`)
- **AI Model**: Google Gemini 2.5 Flash Preview

### Environment Variables

Required in deployment environment (Vercel):
- `VITE_GEMINI_API_KEY`: Google Gemini API key (used by `api/generate.js`)

**Note**: The `.env` file is gitignored. Never commit API keys.

### File Structure

```
src/
  App.jsx           - Main component with DCF logic and AI integration
  main.jsx          - React entry point
  index.css         - Tailwind imports

api/
  generate.js       - Vercel serverless function (API proxy)

Configuration files:
  vite.config.js    - Vite configuration
  tailwind.config.js - Tailwind CSS config
  eslint.config.js  - ESLint flat config (React hooks + refresh plugins)
```

### Important Notes

1. **API Key Security**: The proxy pattern is intentional. Never expose API keys in frontend code or bundle.

2. **Duplicate Files**: Several "副本" (copy) files exist in `src/` (e.g., `App - 副本.jsx`). These are backup copies and should be cleaned up or documented if they serve a purpose.

3. **ESLint Rule**: `no-unused-vars` allows uppercase/underscore patterns (`varsIgnorePattern: '^[A-Z_]'`)

4. **DCF Validation**: The model will return `null` if perpetual growth rate ≥ discount rate (mathematically invalid)

5. **AI Retry Mechanism**: The app retries failed Gemini API calls up to 5 times with exponential backoff (starting at 1s, doubling each time)

## Deployment

This app is designed for Vercel deployment:
- Frontend builds to static files via Vite
- `/api` directory automatically becomes serverless functions
- Set `VITE_GEMINI_API_KEY` in Vercel environment variables
