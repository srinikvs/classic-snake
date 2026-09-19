import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SETTINGS,
  applyHighScore,
  intervalFor,
  loadSave,
  persist,
} from "../../src/game/engine.ts";
import { GAME_VERSION, STORAGE_KEY } from "../../src/game/types.ts";
import { makeSave } from "./fixtures.ts";
import type { CaseFile, Expectation, Step } from "./types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const mem = new Map<string, string>();

function ensureLocalStorage(): void {
  if (typeof (globalThis as { localStorage?: Storage }).localStorage?.getItem === "function") return;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, String(v));
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    },
  });
}

function writeSave(highScore: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSave(highScore)));
}

function applyExpect(exp: Expectation, caseId: string): void {
  const tag = `${caseId}/${exp.assert}`;
  switch (exp.assert) {
    case "highScore": {
      assert.equal(loadSave().highScore, Number(exp.value), tag);
      return;
    }
    case "savePresent": {
      assert.equal(localStorage.getItem(STORAGE_KEY) !== null, Boolean(exp.value), tag);
      return;
    }
    case "tickInterval": {
      const actual = intervalFor(Number(exp.level ?? 1), Boolean(exp.mobile));
      if (exp.value != null) assert.equal(actual, Number(exp.value), tag);
      if (exp.min != null) assert.ok(actual >= Number(exp.min), `${tag}: ${actual} < ${exp.min}`);
      if (exp.max != null) assert.ok(actual <= Number(exp.max), `${tag}: ${actual} > ${exp.max}`);
      return;
    }
    case "mobileSlowerThanDesktop": {
      const level = Number(exp.level ?? 1);
      assert.ok(intervalFor(level, true) > intervalFor(level, false), tag);
      return;
    }
    case "versionMatchesPackage": {
      const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
      assert.equal(GAME_VERSION, pkg.version, tag);
      return;
    }
    case "htmlHasVersionTag": {
      const html = readFileSync(join(ROOT, String(exp.file ?? "index.html")), "utf8");
      assert.match(html, new RegExp(`Classic Snake v${GAME_VERSION.replaceAll(".", "\\.")}`), tag);
      return;
    }
    case "uiUsesVersionLabel": {
      const src = readFileSync(join(ROOT, String(exp.file ?? "src/game/SnakeApp.tsx")), "utf8");
      assert.match(src, /GAME_VERSION/, tag);
      assert.doesNotMatch(src, /v1\.\d+\.\d+/, tag);
      return;
    }
    default:
      throw new Error(`${tag}: unknown unit assert "${exp.assert}"`);
  }
}

function runStep(step: Step, c: CaseFile): void {
  const tag = `${c.id}/${step.op}`;
  switch (step.op) {
    case "readVersionSources":
    case "nop":
      return;
    case "expect":
      applyExpect(step as unknown as Expectation, c.id);
      return;
    case "persistBest": {
      ensureLocalStorage();
      if (step.reset !== false) localStorage.clear();
      const prior = Number(step.priorBest ?? 0);
      persist(prior, DEFAULT_SETTINGS);
      applyHighScore(prior, Number(step.score), DEFAULT_SETTINGS);
      return;
    }
    case "seedHigh": {
      ensureLocalStorage();
      if (step.reset !== false) localStorage.clear();
      writeSave(Number(step.score ?? 0));
      return;
    }
    default:
      throw new Error(`${tag}: unknown unit op "${step.op}"`);
  }
}

export function runUnitCase(c: CaseFile): void {
  ensureLocalStorage();
  localStorage.clear();
  for (const step of c.steps) runStep(step, c);
  for (const exp of c.expect) applyExpect(exp, c.id);
}
