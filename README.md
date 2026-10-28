# TAULA IRAQ — Browser Prototype

A visual prototype for a premium Iraqi backgammon-style browser game.

## Current status

This is an early front-end prototype, **not a complete rules-accurate or online game**.

Included:
- RTL Arabic UI with Iraqi-inspired luxury black/gold/wood styling
- Responsive landing screen
- Board rendering and checker stacks
- Dice rolling and a basic local turn loop
- A simple baseline AI opponent

Not yet implemented / not verified:
- Full Iraqi house-rule validation
- Bar re-entry, bearing off, and all legal-move constraints
- Correct complete backgammon turn legality (including the higher die rule and move sequencing)
- Robust AI strategy
- Online multiplayer, rooms, authentication, server-authoritative dice/moves, reconnects
- Real 3D assets; board is currently a stylized 2D/CSS interface
- Cross-device QA and production deployment

**Do not publish this prototype as a finished rules-correct game.** The first next step is to confirm the exact Iraqi rules with several experienced local players, then replace the simplified move engine with a tested rules module.

## Requirements

- Node.js 20 or later recommended
- npm

## Run on Windows

1. Install Node.js LTS from the official Node.js website.
2. Extract the ZIP.
3. Open the extracted `taula-iraq` folder.
4. Click the folder address bar in File Explorer, type `cmd`, and press Enter.
5. Run:

```bash
npm install
npm run dev
```

6. Open the local URL printed by Vite, usually `http://localhost:5173`.

To test a production build:

```bash
npm run build
npm run preview
```

## Suggested architecture for the next milestone

- `src/rules/` — pure, unit-tested Iraqi rules engine
- `src/game/` — board state, turn state, legal moves
- `src/ui/` — board and menus
- `server/` — Node.js + Socket.IO server; server validates all moves and rolls dice
- Add a free-tier host only after the local rules engine is correct. Free-tier limits and availability can change.

## Security requirements for online mode

- Server is authoritative for turn order, dice, legal moves, score and match completion.
- Clients send intentions (e.g. move checker from point A using die B), never a trusted full board state.
- Validate room membership and current turn on every action.
- Use unpredictable server-side dice generation.
- Rate-limit events and validate payloads.
- Never trust client-side scores or results.
- Do not add real-money wagering or cash prizes to the prototype.
