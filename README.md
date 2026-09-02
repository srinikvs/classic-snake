# Classic Snake

Mobile-first HTML5 Snake. One file, no build step, no frameworks.

Open `index.html` in a browser, or add it to a phone home screen.

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
| Escape | Close settings |

180° reverse into the body is blocked.

Phone layout keeps the board, score, and D-pad on screen. Landscape puts the pad beside the board.

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

Canvas 2D + `requestAnimationFrame`. Web Audio beeps. Offline-capable.

## License

Use and modify freely for personal or commercial projects.
