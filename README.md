# Tiny Poker 🃏

Mobile-first **No-Limit Texas Hold'em** for the browser — pure vanilla
JavaScript, no dependencies, no build step, everything saves locally.

The root `index.html` is the casino lobby with two ways to play:

| Mode | Link | Rules |
|------|------|-------|
| 💵 **Cash game** | `poker/?mode=cash` | Blinds $10/$20, sit with your bankroll, rebuy when busted |
| 🏆 **Sit & Go tournament** | `poker/?mode=tourney` | $200 buy-in, 1,500 chips, blinds up every 6 hands, no rebuys, top 3 of 5 paid $600/$300/$100 |

(The repo also still contains the older Tiny Transport game under
`/transport/`, unlinked from the site.)

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
- **Tournament mode** — rising blind levels, eliminations with final
  placements, prize payouts into your bankroll, titles tracked.
- **Persistence** — bankroll, hands played/won, biggest pot, tournaments and
  titles are kept in `localStorage`.

## Development

The poker engine is DOM-free (`poker/js/cards.js`, `ai.js`, `engine.js`) and covered
by a headless test that checks the hand evaluator, simulates 300 cash hands
and 20 complete tournaments, and verifies chip conservation throughout:

```bash
node poker/test/poker-smoke.js  # poker engine + evaluator
node transport/test/smoke.js    # transport game logic
```

Poker UI lives in `poker/js/ui.js`, `poker/js/save.js`, `poker/js/main.js`.
See `transport/README.md` for the transport game's docs.
