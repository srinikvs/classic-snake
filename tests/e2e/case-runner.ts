import { expect, type Page } from "@playwright/test";
import type { CaseFile, Expectation, Step } from "../cases/types.ts";
import { eatOnce, openFresh, readSave, requireBox, seedHigh, startPlay, waitProbe } from "./helpers.ts";

async function applyExpect(page: Page, exp: Expectation, caseId: string): Promise<void> {
  const tag = `${caseId}/${exp.assert}`;
  switch (exp.assert) {
    case "visible":
      await expect(page.getByTestId(String(exp.testId)), tag).toBeVisible();
      return;
    case "hidden":
      await expect(page.getByTestId(String(exp.testId)), tag).toBeHidden();
      return;
    case "count": {
      const loc = exp.selector
        ? page.getByTestId(String(exp.testId)).locator(String(exp.selector))
        : page.getByTestId(String(exp.testId));
      await expect(loc, tag).toHaveCount(Number(exp.value));
      return;
    }
    case "text": {
      const re = new RegExp(String(exp.match));
      await expect(page.getByTestId(String(exp.testId)), tag).toHaveText(re);
      return;
    }
    case "textEquals":
      await expect(page.getByTestId(String(exp.testId)), tag).toHaveText(String(exp.value));
      return;
    case "below": {
      const above = await page.getByTestId(String(exp.above)).boundingBox();
      const below = await page.getByTestId(String(exp.below)).boundingBox();
      expect(above && below, tag).toBeTruthy();
      expect(below!.y, tag).toBeGreaterThan(above!.y);
      return;
    }
    case "heading":
      await expect(page.getByRole("heading", { name: String(exp.name) }).first(), tag).toBeVisible();
      return;
    case "viewport": {
      const vp = page.viewportSize();
      expect(vp, tag).toEqual({ width: Number(exp.width), height: Number(exp.height) });
      return;
    }
    case "inViewport":
    case "noVerticalClip": {
      const vp = page.viewportSize()!;
      const ids = (Array.isArray(exp.testId) ? exp.testId : [exp.testId]) as string[];
      for (const id of ids) {
        const box = await requireBox(page, id, tag);
        expect(box.y, `${tag} ${id} top`).toBeGreaterThanOrEqual(-1);
        expect(box.y + box.height, `${tag} ${id} bottom`).toBeLessThanOrEqual(vp.height + 1);
        expect(box.x, `${tag} ${id} left`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${tag} ${id} right`).toBeLessThanOrEqual(vp.width + 1);
      }
      return;
    }
    case "boardUsable": {
      const box = await requireBox(page, "board", tag);
      expect(box.width, `${tag} width`).toBeGreaterThanOrEqual(Number(exp.minWidth ?? 200));
      expect(box.height, `${tag} height`).toBeGreaterThanOrEqual(Number(exp.minHeight ?? 200));
      return;
    }
    case "controlsAboveHomeBar": {
      const vp = page.viewportSize()!;
      const sab = Number(exp.sab ?? 0);
      const ids = (Array.isArray(exp.testId) ? exp.testId : [exp.testId]) as string[];
      for (const id of ids) {
        const box = await requireBox(page, id, tag);
        expect(box.y + box.height, `${tag} ${id} above home-bar`).toBeLessThanOrEqual(vp.height - sab + 2);
      }
      return;
    }
    case "storageHigh": {
      await expect
        .poll(
          async () => {
            const save = await readSave(page);
            return save?.highScore ?? null;
          },
          { message: tag },
        )
        .toBe(Number(exp.value));
      return;
    }
    case "tickInterval": {
      await waitProbe(page);
      await expect
        .poll(async () => page.evaluate(() => window.__snake?.getInterval() ?? null), { message: tag })
        .toBe(Number(exp.value));
      return;
    }
    default:
      throw new Error(`${tag}: unknown e2e/pixel assert "${exp.assert}"`);
  }
}

async function runStep(page: Page, step: Step, c: CaseFile): Promise<void> {
  switch (step.op) {
    case "openFresh":
      await openFresh(page);
      return;
    case "seedHigh":
      await seedHigh(page, Number(step.score ?? 0));
      return;
    case "startPlay":
      await startPlay(page);
      return;
    case "click":
      await page.getByTestId(String(step.testId)).click({ force: true });
      return;
    case "waitVisible":
      await expect(page.getByTestId(String(step.testId))).toBeVisible();
      return;
    case "waitProbe":
      await waitProbe(page);
      return;
    case "eatOnce":
      await eatOnce(page);
      return;
    case "reload":
      await page.reload();
      await expect(page.getByTestId("hud")).toBeVisible();
      return;
    case "emulateSafeArea": {
      const sat = Number(step.sat ?? 0);
      const sab = Number(step.sab ?? 0);
      await page.addStyleTag({
        content: `.snake-root { --safe-top: ${sat}px; --safe-bottom: ${sab}px; --safe-left: 0px; --safe-right: 0px; }`,
      });
      const vp = page.viewportSize()!;
      await page.setViewportSize({ width: vp.width, height: vp.height - 1 });
      await page.setViewportSize(vp);
      return;
    }
    case "expect":
      await applyExpect(page, step as unknown as Expectation, c.id);
      return;
    default:
      throw new Error(`${c.id}: unknown e2e op "${step.op}"`);
  }
}

export async function runE2ECase(page: Page, c: CaseFile): Promise<void> {
  for (const step of c.steps) await runStep(page, step, c);
  for (const exp of c.expect) await applyExpect(page, exp, c.id);
}
