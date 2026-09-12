export const GAME_VERSION = "1.1.1";
export const STORAGE_KEY = "classic-snake-v1";

export type Status = "ready" | "playing" | "paused" | "over";

export type Vec = { x: number; y: number };

export type Theme = {
  id: string;
  name: string;
  bg: string;
  grid: string;
};

export type Settings = {
  snakeColor: string;
  foodColor: string;
  themeId: string;
  gridSize: number;
  thickness: number;
  wrap: boolean;
  sound: boolean;
};

export type Snapshot = {
  status: Status;
  score: number;
  highScore: number;
  level: number;
  foodsThisLevel: number;
  gridSize: number;
  settings: Settings;
  toast: string | null;
  beatBest: boolean;
};

export type ControlsProbe = {
  getState: () => Status;
  getScore: () => number;
  getHigh: () => number;
  getLevel: () => number;
  start: () => void;
  queueDir: (x: number, y: number) => void;
};

declare global {
  interface Window {
    __snake?: ControlsProbe;
    __controlsTest?: ControlsProbe;
  }
}

export {};
