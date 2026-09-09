import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Menu, Pause, Play, X } from "lucide-react";
import { FOOD_COLORS, GAME_CODES, SNAKE_COLORS, SnakeEngine, THEMES } from "./engine";
import { GAME_VERSION, type Snapshot } from "./types";
import "./snake.css";

const HOW_TO = [
  "Swipe the board, use the D-pad, or arrows / WASD to turn. Reverse into yourself is blocked.",
  "Eat the pulsing block. Score is 10 × current level per bite.",
  "Every 10 bites: new level, snake resets to length 3, speed goes up. Score stays.",
  "Hit a wall or yourself and the run ends — unless wrap-around is on in Settings.",
];

const emptySnap = (): Snapshot => ({
  status: "ready",
  score: 0,
  highScore: 0,
  level: 1,
  foodsThisLevel: 0,
  gridSize: 16,
  settings: {
    snakeColor: SNAKE_COLORS[0],
    foodColor: FOOD_COLORS[0],
    themeId: "ink",
    gridSize: 16,
    thickness: 0.78,
    wrap: false,
    sound: true,
  },
  toast: null,
  beatBest: false,
});

export function SnakeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const [snap, setSnap] = useState<Snapshot>(emptySnap);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SnakeEngine(canvas);
    engineRef.current = engine;
    engine.onChange = setSnap;
    setSnap(engine.snapshot());
    engine.startLoop();

    const probe = {
      getState: () => engine.status,
      getScore: () => engine.score,
      getHigh: () => engine.highScore,
      getLevel: () => engine.level,
      start: () => engine.play(),
      queueDir: (x: number, y: number) => engine.queueDir(x, y),
    };
    window.__snake = probe;
    window.__controlsTest = probe;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (engine.handleKey(e.code, menuOpenRef.current) || (GAME_CODES.has(e.code) && !menuOpenRef.current)) {
        e.preventDefault();
      }
    };
    const onVis = () => engine.onVisibility();
    const onResize = () => engine.resize();
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const slot = slotRef.current;
    const apply = () => {
      if (!slot) return;
      const size = Math.max(140, Math.floor(Math.min(slot.clientWidth, slot.clientHeight)));
      slot.style.setProperty("--board", size + "px");
      engine.resize();
    };
    apply();
    const ro = slot && window.ResizeObserver ? new ResizeObserver(apply) : null;
    if (slot && ro) ro.observe(slot);

    return () => {
      engine.destroy();
      engineRef.current = null;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
    };
  }, []);

  const start = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const queueDir = useCallback((x: number, y: number) => {
    engineRef.current?.queueDir(x, y);
  }, []);

  const openMenu = useCallback(() => {
    const engine = engineRef.current;
    if (engine?.status === "playing") engine.togglePause();
    setMenuOpen(true);
  }, []);

  const idle = snap.status === "ready" || snap.status === "over";
  const paused = snap.status === "paused" && !menuOpen;

  return (
    <div className="snake-root">
      <div className="shell">
        <div className={`col${idle ? " is-idle" : ""}`}>
          <header>
            <div className="brand">
              <h1>Classic Snake</h1>
              <span className="ver-badge" aria-label={`Version ${GAME_VERSION}`}>
                v{GAME_VERSION}
              </span>
            </div>
            <div className="hud">
              <span className="lv">LV {snap.level}</span>
              <span className="score">{snap.score}</span>
            </div>
            <div className={`best-chip${snap.beatBest ? " is-hot" : ""}`} aria-live="polite">
              <span className="best-label">Best</span>
              <span className="best-value">{snap.highScore}</span>
            </div>
            <button type="button" className="icon-btn" aria-label="Open menu" onClick={openMenu}>
              <Menu size={20} strokeWidth={2} />
            </button>
          </header>

          <div className="board-slot" id="slot" ref={slotRef}>
            <div className="board-stack">
              <div
                className="board-frame"
                id="board"
                onPointerDown={(e) => {
                  if (engineRef.current?.status !== "playing") return;
                  engineRef.current.onPointerDown(e.nativeEvent);
                }}
                onPointerMove={(e) => engineRef.current?.onPointerMove(e.nativeEvent)}
                onPointerUp={(e) => engineRef.current?.onPointerUp(e.nativeEvent)}
                onPointerCancel={(e) => engineRef.current?.onPointerUp(e.nativeEvent)}
              >
                <canvas ref={canvasRef} id="canvas" aria-label="Snake board" />
              </div>

              {snap.status === "ready" && (
                <div className="veil" id="overlay">
                  <div className="card card-launch" id="overlayCard">
                    <div className="card-head">
                      <p className="kicker">Playadda</p>
                      <span className="ver-badge" aria-label={`Version ${GAME_VERSION}`}>
                        v{GAME_VERSION}
                      </span>
                    </div>
                    <h2>Classic Snake</h2>
                    <p className="tag">Eat. Grow. Don't crash.</p>
                    <div className="hi" aria-live="polite">
                      <span className="hi-label">High score</span>
                      <span className="hi-value">{snap.highScore}</span>
                    </div>
                    <section className="howto" aria-labelledby="howto-title">
                      <h3 id="howto-title" className="howto-title">
                        How to play
                      </h3>
                      <ol className="howto-list">
                        {HOW_TO.map((step, i) => (
                          <li key={step}>
                            <span className="howto-n">{i + 1}</span>
                            <span className="howto-t">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                    <button type="button" className="cta" onClick={start}>
                      Start
                    </button>
                  </div>
                </div>
              )}

              {snap.status === "over" && (
                <div className="veil" id="overlay">
                  <div className="card">
                    <div className="card-head">
                      <p className={`kicker${snap.beatBest ? "" : " danger"}`}>
                        {snap.beatBest ? "New high score" : "Game over"}
                      </p>
                      <span className="ver-badge" aria-label={`Version ${GAME_VERSION}`}>
                        v{GAME_VERSION}
                      </span>
                    </div>
                    <p className="big-score">{snap.score}</p>
                    <p>
                      Level {snap.level}
                      {" · "}
                      Best {snap.highScore}
                    </p>
                    <button type="button" className="cta" onClick={start}>
                      Start
                    </button>
                    <button type="button" className="cta ghost" onClick={openMenu}>
                      Settings
                    </button>
                  </div>
                </div>
              )}

              {paused && (
                <button
                  type="button"
                  className="veil pause"
                  aria-label="Resume"
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    engineRef.current?.resume();
                  }}
                >
                  <div className="card">
                    <p className="kicker">Paused</p>
                    <p>Tap to resume</p>
                  </div>
                </button>
              )}

              {snap.toast && <div className="toast">{snap.toast}</div>}
            </div>
          </div>

          <div className="meta">
            <span>
              {snap.foodsThisLevel} / 10 to next level
            </span>
            <span>
              Best {snap.highScore}
            </span>
          </div>

          <div className="dpad" id="dpad">
            <span />
            <PadBtn dir="0,-1" label="Up" onDir={queueDir} />
            <span />
            <PadBtn dir="-1,0" label="Left" onDir={queueDir} />
            <button
              type="button"
              className="dpad-btn pause"
              aria-label={paused ? "Resume" : "Pause"}
              onPointerDown={(e) => {
                e.preventDefault();
                engineRef.current?.togglePause();
              }}
            >
              {paused ? <Play size={20} fill="currentColor" /> : <Pause size={20} strokeWidth={2} />}
            </button>
            <PadBtn dir="1,0" label="Right" onDir={queueDir} />
            <span />
            <PadBtn dir="0,1" label="Down" onDir={queueDir} />
            <span />
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="drawer-root">
          <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="drawer" role="dialog" aria-label="Settings">
            <div className="drawer-head">
              <h2>Settings</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setMenuOpen(false)}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div className="drawer-body">
              <div>
                <p className="label">Snake</p>
                <div className="swatches">
                  {SNAKE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      data-active={c.toLowerCase() === snap.settings.snakeColor.toLowerCase()}
                      aria-label={c}
                      onClick={() => engineRef.current?.setSettings({ snakeColor: c })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Food</p>
                <div className="swatches">
                  {FOOD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      data-active={c.toLowerCase() === snap.settings.foodColor.toLowerCase()}
                      aria-label={c}
                      onClick={() => engineRef.current?.setSettings({ foodColor: c })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Board</p>
                <div className="swatches">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="theme-swatch"
                      style={{ background: t.bg }}
                      data-active={t.id === snap.settings.themeId}
                      aria-label={t.name}
                      onClick={() => engineRef.current?.setSettings({ themeId: t.id })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="slider-head">
                  <p className="label">Grid size</p>
                  <span className="val">
                    {snap.settings.gridSize} × {snap.settings.gridSize}
                  </span>
                </div>
                <div className="slider-wrap">
                  <div className="slider-track" />
                  <div
                    className="slider-fill"
                    style={{ width: ((snap.settings.gridSize - 10) / 14) * 100 + "%" }}
                  />
                  <input
                    type="range"
                    min={10}
                    max={24}
                    value={snap.settings.gridSize}
                    aria-label="Grid size"
                    onChange={(e) => engineRef.current?.setSettings({ gridSize: Number(e.target.value) })}
                  />
                </div>
                <p className="hint">Applies on a new game</p>
              </div>
              <div>
                <div className="slider-head">
                  <p className="label">Snake thickness</p>
                  <span className="val">{Math.round(snap.settings.thickness * 100)}%</span>
                </div>
                <div className="slider-wrap">
                  <div className="slider-track" />
                  <div
                    className="slider-fill"
                    style={{ width: ((snap.settings.thickness * 100 - 50) / 45) * 100 + "%" }}
                  />
                  <input
                    type="range"
                    min={50}
                    max={95}
                    value={Math.round(snap.settings.thickness * 100)}
                    aria-label="Snake thickness"
                    onChange={(e) =>
                      engineRef.current?.setSettings({ thickness: Number(e.target.value) / 100 })
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className="toggle-row"
                aria-pressed={snap.settings.wrap}
                onClick={() => engineRef.current?.setSettings({ wrap: !snap.settings.wrap })}
              >
                Wrap around walls
                <span className="toggle" data-on={snap.settings.wrap}>
                  <span className="toggle-knob" />
                </span>
              </button>
              <button
                type="button"
                className="toggle-row"
                aria-pressed={snap.settings.sound}
                onClick={() => engineRef.current?.setSettings({ sound: !snap.settings.sound })}
              >
                Sound
                <span className="toggle" data-on={snap.settings.sound}>
                  <span className="toggle-knob" />
                </span>
              </button>
              <p className="hint">v{GAME_VERSION} · Playadda</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PadBtn({
  dir,
  label,
  onDir,
}: {
  dir: string;
  label: string;
  onDir: (x: number, y: number) => void;
}) {
  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const [x, y] = dir.split(",").map(Number);
    onDir(x, y);
  };
  const path =
    dir === "0,-1"
      ? "M18 15l-6-6-6 6"
      : dir === "0,1"
        ? "M6 9l6 6 6-6"
        : dir === "-1,0"
          ? "M15 18l-6-6 6-6"
          : "M9 18l6-6-6-6";
  return (
    <button type="button" className="dpad-btn" data-dir={dir} aria-label={label} onPointerDown={onDown}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={path} />
      </svg>
    </button>
  );
}
