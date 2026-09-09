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
- Anything destructive asks first: ending a round, undoing one, clearing a
  player's cards, removing a player, and starting a new game. Cancel, Escape
  and the backdrop are all safe; only the confirm button acts. A new game on a
  pristine board skips the dialog, since there's nothing to lose.
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

## Deploying to Dokploy

The repo ships a `Dockerfile` that serves the three static files with nginx, so
Dokploy needs no build command and no environment variables.

### As an Application (recommended)

1. **Create** → *Application*, and give it a name.
2. **Provider** → *GitHub* → repository `Shogoki/flip7`, branch `main`.
   (Or *Git* with the clone URL if the GitHub app isn't installed.)
3. **Build Type** → *Dockerfile*, with the path left at `./Dockerfile`.
4. **Domains** → *Add Domain*: enter the hostname, set **Container Port** to
   **`80`**, and switch on HTTPS (Let's Encrypt). Port 80 is the one thing
   worth double-checking — Dokploy defaults that field to `3000`, which will
   produce a 502 against this image.
5. **Deploy**. Enable *Auto Deploy* to rebuild on each push to `main`.

Optionally set the health-check path to `/healthz` under *Advanced* → the
image already answers it with a plain `200 ok`.

### As a Compose service

Point Dokploy's *Compose* service type at `docker-compose.yml`. It builds the
same image and only `expose`s port 80 — Dokploy attaches its own Traefik
labels from the Domains tab, so don't add labels or host port mappings to the
compose file.

### Running the image locally

```sh
docker build -t flip7-scorepad .
docker run --rm -p 8080:80 flip7-scorepad   # http://localhost:8080
```

### What nginx is configured to do

- `/healthz` returns `200 ok` for container and platform health probes.
- `Cache-Control: no-cache` on everything. `styles.css` and `app.js` have no
  content hash in their filenames, so the browser revalidates (cheap 304s on a
  few KB) and a redeploy is picked up immediately instead of serving a stale
  mix of old CSS and new JS.
- gzip for CSS and JS.
- `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy` headers.
- Unknown paths fall back to `index.html`.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` publishes the app on every push to `main`.

**One-time setup (required):** go to **Settings → Pages** and set **Source** to
**GitHub Actions**. The workflow cannot do this for you — creating a Pages site
needs repository admin rights, and a workflow's `GITHUB_TOKEN` doesn't have
them, so the first run fails with `Resource not accessible by integration`
until the switch is flipped.

Then re-run the workflow (**Actions → Deploy to GitHub Pages → Run workflow**,
or just push again). The site lands at:

```
https://shogoki.github.io/flip7/
```

The app uses relative paths for `styles.css` and `app.js`, so it works
unchanged under the `/flip7/` project subpath — nothing to configure.

Only `index.html`, `styles.css` and `app.js` are published; the `Dockerfile`
and nginx config stay off the public site. Markdown-only commits don't trigger
a deploy.

### Pages or Dokploy?

They're independent and can both run. Pages is free and needs no server, but
serves static files only. The Dokploy route gives you your own domain and the
nginx config (security headers, health check, cache policy) — worth it if this
ever grows a backend.
