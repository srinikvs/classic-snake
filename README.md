# Classic Snake

Mobile-first HTML5 Snake. Vite + React, Playadda UX standard.

Play at `https://playadda.duckdns.org/classic-snake/` after deploy. Vite `base` is **`/classic-snake/`**.

**Deploy serves the repo root.** Root `index.html` + `assets/` are the **production build** (hashed JS/CSS under `/classic-snake/assets/`). Do not deploy the Vite dev entry (`/src/main.tsx`). After source changes run `npm run build` and commit the promoted files.

## v1.1.0

Playadda UX (gameplay unchanged):

1. Version ID (`v1.1.0`) on the HUD, title overlay, and game over.
2. How to play **before** play, with **Start on the same screen**.
3. Overall high score in the header and on the title card. Updates live when beaten (`localStorage` key `classic-snake-v1`).

## Play

- Eat the pulsing block. Score is **10 × current level** per bite.
- Every 10 bites: new level, snake resets to length 3, speed goes up. Score stays.
- Crash into a wall or yourself to end the run (unless wrap-around is on).
- Best score and settings save in `localStorage`.

## Controls

| Input | Action |
| --- | --- |
| Swipe on the board | Turn |
| On-screen D-pad | Turn |
| Center pad / Space / P | Pause |
| Arrow keys / WASD | Turn |
| Enter / Space on title | Start |
| Escape | Close settings |

180° reverse into the body is blocked.

Phone layout keeps the board, score, and D-pad on screen. Landscape puts the pad beside the board. Pixel 7a: safe-area padding, no home-bar clip.

## Settings

Hamburger menu:

- Snake / food / board colors
- Grid size 10–24 (applies on a new game)
- Snake thickness
- Wrap around walls
- Sound

## Speed

Level 1 steps every 168ms. Each level is 14ms faster, floored at 55ms.

## Stack

Vite 6 + React 19 + TypeScript. Canvas 2D + `requestAnimationFrame`. Web Audio beeps.

```bash
npm install
npm run dev      # restores index.dev.html, http://localhost:5173/classic-snake/
npm run build    # dist/ then promotes index.html + assets/ for Playadda
```

## License

Use and modify freely for personal or commercial projects.
