# Flip 7 Scorepad

A small web app for keeping score in the **Flip 7** card game. No build step, no
dependencies — three static files you can open straight from disk.

## Use it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What it does

- Add players, set the target score (200 by default), and start a game.
- Tap a player to open the card pad: the number cards 0–12 they collected, the
  `+2 … +10` modifiers, and `×2`.
- Round score is computed live: `sum of numbers` → `×2` if held → `+` modifiers,
  plus **+15** when all 7 number cards are in.
- **Busted** zeroes the round; **Stayed / Frozen** just marks the player done.
- "End round" banks every score, shows a per-round history table, and announces
  a winner once someone reaches the target. "Undo last round" reverses it.
- The game is saved to `localStorage`, so a refresh or a closed tab won't lose it.

## Scoring rules used

| Situation | Points |
| --- | --- |
| Number cards | Face value, each number counted once |
| `×2` modifier | Doubles the number-card sum (applied before `+` modifiers) |
| `+2 … +10` | Added after the doubling |
| Flip 7 (all 7 numbers) | `+15` bonus, round ends |
| Bust (duplicate number) | `0` for the round |

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup: setup screen, scoreboard, card-entry and rules dialogs |
| `styles.css` | Dark, mobile-first styling |
| `app.js` | State, scoring, persistence, rendering |
