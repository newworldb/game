# Tiny Poker 🃏

Mobile-first **No-Limit Texas Hold'em** for the browser. Pure vanilla
JavaScript — no dependencies, no build step. Your bankroll and stats save
automatically to your browser.

> 🚆 Looking for the transport game? It lives at [`/transport/`](transport/).

## Play

Serve the folder with any static server and open it on your phone or desktop:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Features

- **Full NLHE rules** — blinds, dealer button rotation, min-raise tracking,
  all-ins with **correct side pots**, split pots, showdown ordering.
- **4 AI opponents with personalities** — decisions come from Monte-Carlo
  equity simulation plus pot odds; each bot has its own tightness and
  aggression (🐗 Rocco bluffs, 🐻 Viktor is a rock).
- **Touch-friendly table UI** — green felt, card animations, dealer chip,
  bet chips, turn highlight, winner glow, raise slider with Min / ½ Pot /
  Pot / All-in shortcuts.
- **Persistence** — bankroll, hands played/won and biggest pot are kept in
  `localStorage`; bust and you get a fresh $2,000 stack.

## Development

The engine is DOM-free (`js/cards.js`, `js/ai.js`, `js/engine.js`) and covered
by a headless test that checks the hand evaluator and simulates 300 full
bot-vs-bot hands verifying chip conservation:

```bash
node test/poker-smoke.js     # poker engine + evaluator
node transport/test/smoke.js # transport game logic
```

UI lives in `js/ui.js`, `js/save.js`, `js/main.js`.
