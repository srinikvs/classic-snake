import { DEFAULT_SETTINGS } from "../../src/game/engine.ts";
import { STORAGE_KEY, type Settings } from "../../src/game/types.ts";

export { STORAGE_KEY, DEFAULT_SETTINGS };

export type SaveBlob = {
  version: 1;
  highScore: number;
  settings: Settings;
};

export function makeSave(highScore = 0, settings: Settings = DEFAULT_SETTINGS): SaveBlob {
  return { version: 1, highScore, settings: { ...settings } };
}
