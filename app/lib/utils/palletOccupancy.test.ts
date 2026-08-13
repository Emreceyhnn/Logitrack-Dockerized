import { describe, it } from "node:test";
import { expect } from "expect";
import {
  palletsUsedFor,
  totalPalletsUsed,
  palletUsageByWarehouse,
} from "./palletOccupancy";

describe("palletsUsedFor()", () => {
  // The bug this module fixes: 1000 units at 10 per pallet used to report 10
  // (the raw palletCount) instead of 100 pallet positions.
  it("miktarı palet başına adede böler", () => {
    expect(palletsUsedFor({ quantity: 1000, palletCount: 10 })).toBe(100);
  });

  it("kısmi paleti yukarı yuvarlar", () => {
    // 3 units at 10 per pallet still occupies one whole position.
    expect(palletsUsedFor({ quantity: 3, palletCount: 10 })).toBe(1);
    expect(palletsUsedFor({ quantity: 101, palletCount: 10 })).toBe(11);
  });

  it("tam bölünen miktarda yuvarlama yapmaz", () => {
    expect(palletsUsedFor({ quantity: 50, palletCount: 25 })).toBe(2);
  });

  // An unset units-per-pallet is missing data; inventing a default here would
  // silently inflate warehouse capacity — the failure mode being fixed.
  it("paletlenmemiş ürün için 0 döner", () => {
    expect(palletsUsedFor({ quantity: 1000, palletCount: 0 })).toBe(0);
    expect(palletsUsedFor({ quantity: 1000, palletCount: null })).toBe(0);
    expect(palletsUsedFor({ quantity: 1000, palletCount: undefined })).toBe(0);
  });

  it("miktar yoksa veya negatifse 0 döner", () => {
    expect(palletsUsedFor({ quantity: 0, palletCount: 10 })).toBe(0);
    expect(palletsUsedFor({ quantity: null, palletCount: 10 })).toBe(0);
    expect(palletsUsedFor({ quantity: -5, palletCount: 10 })).toBe(0);
  });

  it("negatif palet başına adedi veri hatası sayar", () => {
    expect(palletsUsedFor({ quantity: 100, palletCount: -10 })).toBe(0);
  });
});

describe("totalPalletsUsed()", () => {
  it("kalemlerin palet doluluğunu toplar", () => {
    expect(
      totalPalletsUsed([
        { quantity: 1000, palletCount: 10 }, // 100
        { quantity: 45, palletCount: 20 }, // 3 (yukarı yuvarlanır)
        { quantity: 500, palletCount: 0 }, // 0 (paletlenmemiş)
      ])
    ).toBe(103);
  });

  it("boş listede 0 döner", () => {
    expect(totalPalletsUsed([])).toBe(0);
  });
});

describe("palletUsageByWarehouse()", () => {
  it("satırları depoya göre gruplayıp palet ve hacmi toplar", () => {
    const usage = palletUsageByWarehouse([
      { warehouseId: "wh-1", quantity: 1000, palletCount: 10, volumeM3: 4 },
      { warehouseId: "wh-1", quantity: 200, palletCount: 20, volumeM3: 1.5 },
      { warehouseId: "wh-2", quantity: 30, palletCount: 4, volumeM3: 2 },
    ]);

    expect(usage.get("wh-1")).toEqual({ pallets: 110, volume: 5.5 });
    // 30 / 4 = 7.5 → 8 positions.
    expect(usage.get("wh-2")).toEqual({ pallets: 8, volume: 2 });
  });

  it("hacmi olmayan satırı 0 hacimle sayar", () => {
    const usage = palletUsageByWarehouse([
      { warehouseId: "wh-1", quantity: 10, palletCount: 10, volumeM3: null },
    ]);
    expect(usage.get("wh-1")).toEqual({ pallets: 1, volume: 0 });
  });

  it("bilinmeyen depo için undefined döner", () => {
    expect(palletUsageByWarehouse([]).get("wh-x")).toBe(undefined);
  });
});
