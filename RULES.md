# AI Coding Instructions

## Project Overview
- **Name**: Estonian Map Game SPA (Spot The Place)
- **Architecture**: Single Page Application (SPA) with a Node.js backend

## Tech Stack
- **Frontend**: Vanilla TypeScript (`src/`), Vite for bundling
- **Backend**: Node.js, Express, Axios, Sharp (`server.js` and `scripts/`)
- **Styling**: Vanilla CSS (`src/style.css`)
- **No Frameworks**: Do not use React, Vue, or Tailwind unless explicitly requested.

## Coding Guidelines
- **TypeScript**: Use strict typing. Avoid `any` where possible.
- **Modularity**: Keep `main.ts` clean by extracting logic into `utils.ts` or specialized modules.
- **CSS**: Prioritize modern, dynamic design. Use CSS variables for theming, and include hover effects/micro-animations to make the UI feel premium.
- **Backend**: Keep `server.js` focused on API routes and serving static files or assets.

## Workflow & AI Instructions
- Always prioritize reviewing existing files (`main.ts`, `server.js`) before making architectural changes.
- Ensure the UI remains responsive and visually engaging.
- When creating new features, stick to the Vanilla TS + Vite ecosystem without introducing heavy frontend frameworks.

## Game Mechanics
- **Core Loop**: The game consists of exactly 10 rounds (`TOTAL_ROUNDS = 10`).
- **Scoring**: Points are awarded based on distance from the target. If the distance is less than the difficulty's tolerance, the score is `Math.round(tolerance - distance)`.
- **Difficulties & Tolerances**:
  - Easy: 150 km tolerance
  - Medium: 100 km tolerance
  - Hard: 50 km tolerance
- **Targets (POIs)**: Can be Points (cities), Lines (rivers), or Polygons (terrain, lakes).
- **High Scores**: Saved in localStorage per difficulty.

