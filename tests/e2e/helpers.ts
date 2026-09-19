import { expect, type Page } from "@playwright/test";
import { STORAGE_KEY, makeSave, type SaveBlob } from "../cases/fixtures.ts";

export { STORAGE_KEY };

export async function openFresh(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("classic-snake-e2e-cleared")) return;
    localStorage.clear();
    sessionStorage.setItem("classic-snake-e2e-cleared", "1");
  });
  await page.goto("./");
  await expect(page.getByTestId("start-screen")).toBeVisible();
}

export async function seedHigh(page: Page, highScore: number): Promise<void> {
  const store = makeSave(highScore);
  await page.addInitScript(
    ({ store, STORAGE_KEY }) => {
      if (sessionStorage.getItem("classic-snake-e2e-seeded")) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      sessionStorage.setItem("classic-snake-e2e-seeded", "1");
    },
    { store, STORAGE_KEY },
  );
  await page.goto("./");
  await expect(page.getByTestId("start-screen")).toBeVisible();
}

export async function readSave(page: Page): Promise<SaveBlob | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SaveBlob) : null;
  }, STORAGE_KEY);
}

export async function waitProbe(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__snake?.getInterval === "function");
}

export async function eatOnce(page: Page): Promise<void> {
  await waitProbe(page);
  await page.evaluate(() => {
    const probe = window.__snake;
    if (!probe) throw new Error("window.__snake probe missing");
    probe.placeFoodAhead();
    probe.step();
  });
}
