# Tiny Arcade 🕹️

Little games built for your phone — pure vanilla JavaScript, no dependencies,
no build step, everything saves locally in your browser.

| Game | Path | What it is |
|------|------|------------|
| 🃏 **Tiny Poker** | [`/poker/`](poker/) | No-Limit Texas Hold'em vs 4 AI bots |
| 🚆 **Tiny Transport** | [`/transport/`](transport/) | 3D transport tycoon with living towns |

The root `index.html` is the arcade front page linking both games.

## Play

Serve the folder with any static server and open it on your phone or desktop:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Tiny Poker features

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

The poker engine is DOM-free (`poker/js/cards.js`, `ai.js`, `engine.js`) and covered
by a headless test that checks the hand evaluator and simulates 300 full
bot-vs-bot hands verifying chip conservation:

```bash
node poker/test/poker-smoke.js  # poker engine + evaluator
node transport/test/smoke.js    # transport game logic
```

Poker UI lives in `poker/js/ui.js`, `poker/js/save.js`, `poker/js/main.js`.
See `transport/README.md` for the transport game's docs.
