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

export async function requireBox(
  page: Page,
  testId: string,
  tag: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
  let box: { x: number; y: number; width: number; height: number } | null = null;
  await expect
    .poll(
      async () => {
        box = await page.getByTestId(testId).boundingBox();
        return Boolean(box && box.width >= 1 && box.height >= 1);
      },
      { message: `${tag}: ${testId} missing or not laid out (boundingBox ${box && JSON.stringify(box)})` },
    )
    .toBe(true);
  if (!box) throw new Error(`${tag}: ${testId} missing or not laid out (boundingBox null)`);
  return box;
}

export async function startPlay(page: Page): Promise<void> {
  await waitProbe(page);
  const start = page.getByTestId("start");
  if ((await start.count()) > 0) {
    await start.click({ force: true }).catch(() => undefined);
  }
  await page.evaluate(() => window.__snake?.start());
  await expect
    .poll(async () => page.evaluate(() => window.__snake?.getState() ?? ""), { message: "startPlay: playing" })
    .toBe("playing");
  await requireBox(page, "dpad", "startPlay");
  await requireBox(page, "controls", "startPlay");
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
