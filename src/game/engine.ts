import {
  STORAGE_KEY,
  type Settings,
  type Snapshot,
  type Status,
  type Theme,
  type Vec,
} from "./types";

export const SNAKE_COLORS = [
  "#5dff9a",
  "#5ce1e6",
  "#9ec8ff",
  "#ff7a6e",
  "#f4f4f5",
  "#ffc857",
];
export const FOOD_COLORS = [
  "#ff4d4d",
  "#ff8a3d",
  "#ffd166",
  "#ff6b9d",
  "#f4f4f5",
  "#5ce1e6",
];
export const THEMES: Theme[] = [
  { id: "ink", name: "Ink", bg: "#0b0d12", grid: "rgba(255,255,255,0.055)" },
  { id: "phosphor", name: "Phosphor", bg: "#07140c", grid: "rgba(125,255,179,0.08)" },
  { id: "deep", name: "Deep", bg: "#0a1020", grid: "rgba(140,180,255,0.08)" },
  { id: "carbon", name: "Carbon", bg: "#101010", grid: "rgba(255,255,255,0.045)" },
  { id: "dusk", name: "Dusk", bg: "#14110f", grid: "rgba(255,200,150,0.07)" },
];

const DEFAULT_SETTINGS: Settings = {
  snakeColor: SNAKE_COLORS[0],
  foodColor: FOOD_COLORS[0],
  themeId: "ink",
  gridSize: 16,
  thickness: 0.78,
  wrap: false,
  sound: true,
};

const BASE_INTERVAL = 168;
const MOBILE_BASE_INTERVAL = 250;
const LEVEL_STEP = 14;
const MIN_INTERVAL = 55;
const MOBILE_MIN_INTERVAL = 80;
const START_LENGTH = 3;
const FOODS_PER_LEVEL = 10;
const POINTS_PER_FOOD = 10;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};
type Floater = { x: number; y: number; text: string; life: number; max: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function withAlpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const k = 1 - amount;
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}
function prefersMobilePace(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 768px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function intervalFor(level: number) {
  const mobile = prefersMobilePace();
  const base = mobile ? MOBILE_BASE_INTERVAL : BASE_INTERVAL;
  const min = mobile ? MOBILE_MIN_INTERVAL : MIN_INTERVAL;
  return Math.max(min, base - (level - 1) * LEVEL_STEP);
}
function keyDir(code: string): Vec | null {
  if (code === "ArrowUp" || code === "KeyW") return { x: 0, y: -1 };
  if (code === "ArrowDown" || code === "KeyS") return { x: 0, y: 1 };
  if (code === "ArrowLeft" || code === "KeyA") return { x: -1, y: 0 };
  if (code === "ArrowRight" || code === "KeyD") return { x: 1, y: 0 };
  return null;
}
function loadSave(): { highScore: number; settings: Settings } {
  const fallback = { highScore: 0, settings: { ...DEFAULT_SETTINGS } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { highScore?: number; settings?: Partial<Settings> };
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    settings.gridSize = clamp(Math.round(settings.gridSize), 10, 24);
    settings.thickness = clamp(settings.thickness, 0.5, 0.95);
    if (!THEMES.some((t) => t.id === settings.themeId)) settings.themeId = "ink";
    return { highScore: Math.max(0, Number(parsed.highScore) || 0), settings };
  } catch {
    return fallback;
  }
}
function persist(highScore: number, settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, highScore, settings }));
  } catch {
    /* quota / private mode */
  }
}
function splitWrapped(body: Vec[]) {
  const groups: Vec[][] = [];
  let cur: Vec[] = [];
  for (let i = 0; i < body.length; i++) {
    const p = body[i];
    if (i === 0) {
      cur.push(p);
      continue;
    }
    const prev = body[i - 1];
    if (Math.abs(prev.x - p.x) > 1.05 || Math.abs(prev.y - p.y) > 1.05) {
      groups.push(cur);
      cur = [p];
    } else cur.push(p);
  }
  if (cur.length) groups.push(cur);
  return groups;
}
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class SnakeEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  highScore: number;
  status: Status = "ready";
  score = 0;
  level = 1;
  foodsThisLevel = 0;
  beatBest = false;
  gridSize: number;
  snake: Vec[] = [];
  prevSnake: Vec[] = [];
  dir: Vec = { x: 1, y: 0 };
  pending: Vec[] = [];
  food: Vec = { x: 0, y: 0 };
  acc = 0;
  last = 0;
  raf = 0;
  css = 0;
  dpr = 1;
  toast: string | null = null;
  toastUntil = 0;
  reduced: boolean;
  trauma = 0;
  flash = 0;
  particles: Particle[] = [];
  floaters: Floater[] = [];
  audio: AudioContext | null = null;
  onChange: ((snap: Snapshot) => void) | null = null;
  running = false;
  pointerId: number | null = null;
  pointerStart: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is required");
    this.ctx = ctx;
    const save = loadSave();
    this.settings = save.settings;
    this.highScore = save.highScore;
    this.gridSize = this.settings.gridSize;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resetSnake();
    this.spawnFood();
    this.prevSnake = this.snake.map((s) => ({ ...s }));
  }

  tickInterval() {
    return intervalFor(this.level);
  }
  snapshot(): Snapshot {
    return {
      status: this.status,
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      foodsThisLevel: this.foodsThisLevel,
      gridSize: this.gridSize,
      settings: { ...this.settings },
      toast: this.toast,
      beatBest: this.beatBest,
    };
  }
  emit() {
    this.onChange?.(this.snapshot());
  }
  setSettings(partial: Partial<Settings>) {
    this.settings = { ...this.settings, ...partial };
    this.settings.gridSize = clamp(Math.round(this.settings.gridSize), 10, 24);
    this.settings.thickness = clamp(this.settings.thickness, 0.5, 0.95);
    persist(this.highScore, this.settings);
    this.emit();
  }
  unlockAudio() {
    if (!this.audio) {
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.audio = new AC({ latencyHint: "interactive" });
    }
    if (this.audio.state === "suspended") void this.audio.resume();
  }
  play() {
    if (this.status === "playing") return;
    this.unlockAudio();
    this.gridSize = this.settings.gridSize;
    this.status = "playing";
    this.score = 0;
    this.level = 1;
    this.foodsThisLevel = 0;
    this.beatBest = false;
    this.acc = 0;
    this.trauma = 0;
    this.flash = 0;
    this.particles = [];
    this.floaters = [];
    this.pending = [];
    this.toast = null;
    this.resetSnake();
    this.spawnFood();
    this.prevSnake = this.snake.map((s) => ({ ...s }));
    this.emit();
  }
  togglePause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.emit();
    } else if (this.status === "paused") {
      this.status = "playing";
      this.acc = 0;
      this.emit();
    }
  }
  resume() {
    if (this.status === "paused") {
      this.status = "playing";
      this.acc = 0;
      this.emit();
    }
  }
  queueDir(dx: number, dy: number) {
    if (this.status !== "playing") return;
    const last = this.pending[this.pending.length - 1] || this.dir;
    if (dx === last.x && dy === last.y) return;
    if (this.snake.length > 1 && dx === -last.x && dy === -last.y) return;
    if (this.pending.length >= 2) this.pending[1] = { x: dx, y: dy };
    else this.pending.push({ x: dx, y: dy });
  }
  resetSnake() {
    const cy = Math.floor(this.gridSize / 2);
    const cx = Math.floor(this.gridSize / 2);
    this.dir = { x: 1, y: 0 };
    this.snake = [];
    for (let i = 0; i < START_LENGTH; i++) this.snake.push({ x: cx - i, y: cy });
  }
  occupied() {
    const s = new Set<string>();
    for (const p of this.snake) s.add(p.x + "," + p.y);
    return s;
  }
  spawnFood() {
    const taken = this.occupied();
    const empty: Vec[] = [];
    for (let y = 0; y < this.gridSize; y++)
      for (let x = 0; x < this.gridSize; x++)
        if (!taken.has(x + "," + y)) empty.push({ x, y });
    this.food = empty.length ? empty[(Math.random() * empty.length) | 0] : { x: 0, y: 0 };
  }
  step() {
    const nextDir = this.pending.shift();
    if (nextDir) this.dir = nextDir;
    const head = this.snake[0];
    let nx = head.x + this.dir.x;
    let ny = head.y + this.dir.y;
    if (this.settings.wrap) {
      const g = this.gridSize;
      nx = ((nx % g) + g) % g;
      ny = ((ny % g) + g) % g;
    } else if (nx < 0 || ny < 0 || nx >= this.gridSize || ny >= this.gridSize) {
      this.die();
      return;
    }
    const grew = nx === this.food.x && ny === this.food.y;
    this.prevSnake = this.snake.map((s) => ({ ...s }));
    this.snake.unshift({ x: nx, y: ny });
    if (!grew) this.snake.pop();
    else this.prevSnake.unshift({ ...this.prevSnake[0] });
    for (let i = 1; i < this.snake.length; i++) {
      if (this.snake[i].x === nx && this.snake[i].y === ny) {
        this.die();
        return;
      }
    }
    if (grew) this.eat();
  }
  eat() {
    const gained = POINTS_PER_FOOD * this.level;
    this.score += gained;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.beatBest = true;
      persist(this.highScore, this.settings);
    }
    this.foodsThisLevel += 1;
    this.burst(this.food.x + 0.5, this.food.y + 0.5, this.settings.foodColor);
    this.floaters.push({
      x: this.food.x + 0.5,
      y: this.food.y + 0.2,
      text: "+" + gained,
      life: 0.7,
      max: 0.7,
    });
    if (this.foodsThisLevel >= FOODS_PER_LEVEL) {
      this.level += 1;
      this.foodsThisLevel = 0;
      this.resetSnake();
      this.pending = [];
      this.prevSnake = this.snake.map((s) => ({ ...s }));
      this.toast = "LEVEL " + this.level;
      this.toastUntil = performance.now() + 1200;
      this.flash = 0.35;
      this.beepLevel();
      try {
        navigator.vibrate?.(18);
      } catch {
        /* ignore */
      }
    } else {
      this.beepEat();
      try {
        navigator.vibrate?.(8);
      } catch {
        /* ignore */
      }
    }
    this.spawnFood();
    this.emit();
  }
  die() {
    this.status = "over";
    this.trauma = 0.7;
    this.flash = 0.55;
    this.beepDie();
    persist(this.highScore, this.settings);
    try {
      navigator.vibrate?.([20, 40, 30]);
    } catch {
      /* ignore */
    }
    this.emit();
  }
  startLoop() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.update(dt, now);
      this.draw(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.audio) {
      void this.audio.close();
      this.audio = null;
    }
  }
  update(dt: number, now: number) {
    if (this.toast && now > this.toastUntil) {
      this.toast = null;
      this.emit();
    }
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 6 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 0.9 * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.status !== "playing") return;
    this.acc += dt * 1000;
    const interval = intervalFor(this.level);
    let guard = 0;
    while (this.acc >= interval && this.status === "playing" && guard++ < 5) {
      this.acc -= interval;
      this.step();
    }
  }
  resize() {
    const css = Math.max(1, Math.round(this.canvas.clientWidth || 0));
    if (css < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (css === this.css && dpr === this.dpr && this.canvas.width === Math.round(css * dpr)) return;
    this.css = css;
    this.dpr = dpr;
    this.canvas.width = Math.round(css * dpr);
    this.canvas.height = Math.round(css * dpr);
  }
  lerpSnake(t: number) {
    const curr = this.snake;
    const prev = this.prevSnake;
    if (prev.length !== curr.length || this.status !== "playing") return curr.map((s) => ({ ...s }));
    return curr.map((b, i) => {
      const a = prev[i];
      if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) return { ...b };
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    });
  }
  draw(now: number) {
    this.resize();
    const ctx = this.ctx;
    const css = this.css;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const theme = THEMES.find((t) => t.id === this.settings.themeId) || THEMES[0];
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, css, css);
    const shake =
      !this.reduced && this.trauma > 0 ? this.trauma * this.trauma * 7 * (Math.random() * 2 - 1) : 0;
    const shakeY =
      !this.reduced && this.trauma > 0 ? this.trauma * this.trauma * 7 * (Math.random() * 2 - 1) : 0;
    ctx.save();
    ctx.translate(shake, shakeY);
    const g = this.gridSize;
    const cell = css / g;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < g; i++) {
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, css);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(css, i * cell);
    }
    ctx.stroke();
    const interval = intervalFor(this.level);
    const t = this.status === "playing" && !this.reduced ? clamp(this.acc / interval, 0, 1) : 1;
    this.drawFood(ctx, cell, now);
    this.drawSnake(ctx, this.lerpSnake(t), cell);
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size * cell * (0.5 + a * 0.5);
      ctx.fillRect(p.x * cell - s / 2, p.y * cell - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.font = "600 " + Math.max(11, cell * 0.42) + "px Trebuchet MS, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      ctx.fillStyle = "rgba(238,240,243," + clamp(f.life / f.max, 0, 1) + ")";
      ctx.fillText(f.text, f.x * cell, f.y * cell);
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + this.flash * 0.16 + ")";
      ctx.fillRect(0, 0, css, css);
    }
    if (this.status === "over") {
      ctx.fillStyle = "rgba(255,80,70,0.08)";
      ctx.fillRect(0, 0, css, css);
    }
    const vg = ctx.createRadialGradient(css / 2, css / 2, css * 0.35, css / 2, css / 2, css * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, css, css);
  }
  drawFood(ctx: CanvasRenderingContext2D, cell: number, now: number) {
    const pulse = this.reduced ? 1 : 0.86 + Math.sin(now * 0.006) * 0.14;
    const cx = (this.food.x + 0.5) * cell;
    const cy = (this.food.y + 0.5) * cell;
    const size = cell * 0.62 * pulse;
    if (!this.reduced) {
      ctx.save();
      ctx.shadowColor = this.settings.foodColor;
      ctx.shadowBlur = cell * 0.45;
      ctx.fillStyle = withAlpha(this.settings.foodColor, 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = this.settings.foodColor;
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.28);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(ctx, cx - size * 0.22, cy - size * 0.28, size * 0.28, size * 0.2, size * 0.1);
    ctx.fill();
  }
  drawSnake(ctx: CanvasRenderingContext2D, body: Vec[], cell: number) {
    if (!body.length) return;
    const lw = cell * this.settings.thickness;
    const color = this.settings.snakeColor;
    const groups = splitWrapped(body);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const group of groups) {
      if (!group.length) continue;
      ctx.beginPath();
      group.forEach((p, i) => {
        const x = (p.x + 0.5) * cell;
        const y = (p.y + 0.5) * cell;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (group.length === 1) {
        const p = group[0];
        ctx.moveTo((p.x + 0.5) * cell, (p.y + 0.5) * cell);
        ctx.lineTo((p.x + 0.5) * cell + 0.01, (p.y + 0.5) * cell);
      }
      ctx.strokeStyle = darken(color, 0.5);
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
    }
    let seen = 0;
    const total = Math.max(1, body.length - 1);
    for (const group of groups) {
      for (let i = 1; i < group.length; i++) {
        const a = group[i - 1];
        const b = group[i];
        ctx.beginPath();
        ctx.moveTo((a.x + 0.5) * cell, (a.y + 0.5) * cell);
        ctx.lineTo((b.x + 0.5) * cell, (b.y + 0.5) * cell);
        ctx.strokeStyle = withAlpha(color, clamp(1 - (seen / total) * 0.62, 0.38, 1));
        ctx.lineWidth = lw * (0.98 - (seen / body.length) * 0.16);
        ctx.stroke();
        seen += 1;
      }
    }
    const head = body[0];
    const hx = (head.x + 0.5) * cell;
    const hy = (head.y + 0.5) * cell;
    const hr = lw * 0.56;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(hx - hr * 0.2, hy - hr * 0.25, hr * 0.45, 0, Math.PI * 2);
    ctx.fill();
    const ang = Math.atan2(this.dir.y, this.dir.x);
    const fx = Math.cos(ang);
    const fy = Math.sin(ang);
    const px = -fy;
    const py = fx;
    const eyeR = Math.max(1.6, hr * 0.22);
    const pupilR = Math.max(0.9, hr * 0.12);
    for (const side of [-1, 1]) {
      const ex = hx + fx * hr * 0.28 + px * side * hr * 0.38;
      const ey = hy + fy * hr * 0.28 + py * side * hr * 0.38;
      ctx.fillStyle = "#f4f4f5";
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14161c";
      ctx.beginPath();
      ctx.arc(ex + fx * eyeR * 0.42, ey + fy * eyeR * 0.42, pupilR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  burst(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const sp = 1.6 + Math.random() * 2.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        size: 0.12 + Math.random() * 0.1,
        color,
      });
    }
  }
  tone(freq: number, dur: number, type: OscillatorType, vol: number, delay?: number) {
    if (!this.settings.sound || !this.audio) return;
    const t = this.audio.currentTime + (delay || 0);
    const osc = this.audio.createOscillator();
    const g = this.audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }
  beepEat() {
    this.tone(740, 0.06, "square", 0.045);
    this.tone(1180, 0.05, "square", 0.03, 0.04);
  }
  beepLevel() {
    this.tone(523, 0.08, "square", 0.05);
    this.tone(659, 0.08, "square", 0.05, 0.08);
    this.tone(784, 0.12, "square", 0.055, 0.16);
  }
  beepDie() {
    this.tone(220, 0.12, "sawtooth", 0.05);
    this.tone(140, 0.18, "sawtooth", 0.04, 0.08);
    this.tone(80, 0.22, "sawtooth", 0.035, 0.16);
  }
  handleKey(code: string, menuOpen: boolean) {
    if (code === "Escape" || menuOpen) return false;
    if ((code === "Space" || code === "Enter") && (this.status === "ready" || this.status === "over")) {
      this.play();
      return true;
    }
    if ((code === "Space" || code === "KeyP") && (this.status === "playing" || this.status === "paused")) {
      this.togglePause();
      return true;
    }
    const d = keyDir(code);
    if (d) {
      this.queueDir(d.x, d.y);
      return true;
    }
    return false;
  }
  onPointerDown(e: PointerEvent) {
    if (this.status !== "playing") return;
    this.pointerId = e.pointerId;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    try {
      (e.target as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  onPointerMove(e: PointerEvent) {
    if (this.pointerId !== e.pointerId || !this.pointerStart) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    if (Math.hypot(dx, dy) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) this.queueDir(dx > 0 ? 1 : -1, 0);
    else this.queueDir(0, dy > 0 ? 1 : -1);
    this.pointerStart = { x: e.clientX, y: e.clientY };
  }
  onPointerUp(e: PointerEvent) {
    if (this.pointerId === e.pointerId) {
      this.pointerId = null;
      this.pointerStart = null;
    }
  }
  onVisibility() {
    if (document.hidden && this.status === "playing") {
      this.status = "paused";
      this.emit();
    }
    if (!document.hidden && this.audio && this.audio.state === "suspended") void this.audio.resume();
  }
}

export const GAME_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "KeyP",
  "Enter",
]);
