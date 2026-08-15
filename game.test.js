import { describe, expect, it } from "vitest";
import { SECTORS, newGame, sectorAtAngle, spin, update } from "./game.js";

describe("轉轉樂", () => {
  it("獎格包含多個低票格、稀有高票格與裝飾大獎", () => {
    expect(SECTORS.length).toBeGreaterThanOrEqual(8);
    expect(SECTORS.filter((sector) => sector.tickets <= 10).length).toBeGreaterThan(
      SECTORS.filter((sector) => sector.tickets >= 100).length,
    );
    expect(SECTORS.some((sector) => sector.jackpot)).toBe(true);
    expect(SECTORS.every((sector) => sector.weight > 0 && sector.color)).toBe(true);
  });

  it("新局有代幣、零票券且尚未旋轉", () => {
    const game = newGame({ tokens: 3 });
    expect(game.tokens).toBe(3);
    expect(game.tickets).toBe(0);
    expect(game.phase).toBe("ready");
  });

  it("旋轉會消耗代幣並依力道設定角速度", () => {
    const weak = newGame();
    const strong = newGame();
    expect(spin(weak, 0.2)).toBe(true);
    expect(spin(strong, 1)).toBe(true);
    expect(strong.angularVelocity).toBeGreaterThan(weak.angularVelocity);
    expect(strong.tokens).toBe(weak.tokens);
    expect(spin(strong, 1)).toBe(false);
  });

  it("摩擦會讓輪盤停止並按角度給虛擬票券", () => {
    const game = newGame({ tokens: 1 });
    spin(game, 0.5);
    let landed = null;
    for (let i = 0; i < 2000 && !landed; i++) {
      landed = update(game, 0.02).find((event) => event.type === "landed");
    }
    expect(landed).toBeTruthy();
    expect(landed.sector).toBe(SECTORS[landed.index]);
    expect(game.tickets).toBe(landed.sector.tickets);
    expect(game.bestSpin).toBe(landed.sector.tickets);
    expect(game.phase).toBe("ready");
  });

  it("sectorAtAngle 依權重扇區判定且處理繞圈", () => {
    expect(sectorAtAngle(0)).toBe(0);
    expect(sectorAtAngle(Math.PI * 2)).toBe(0);
    expect(sectorAtAngle(-Math.PI * 2)).toBe(0);
  });

  it("沒有代幣時不能旋轉", () => {
    const game = newGame({ tokens: 0 });
    expect(spin(game, 1)).toBe(false);
    expect(game.phase).toBe("ready");
  });
});
