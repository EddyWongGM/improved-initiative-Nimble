import { ApplyResourcePoolChange } from "./ApplyResourcePoolChange";

describe("ApplyResourcePoolChange", () => {
  describe("positiveAmountIncreasesCurrent: false (Mana/Resources/Hit Dice convention)", () => {
    test("spends from temporary first when temporary covers the amount", () => {
      const result = ApplyResourcePoolChange(10, 5, 20, 3);
      expect(result).toEqual({ current: 10, temporary: 2 });
    });

    test("spills over into current once temporary is exhausted", () => {
      const result = ApplyResourcePoolChange(10, 2, 20, 6);
      expect(result).toEqual({ current: 6, temporary: 0 });
    });

    test("restoring does not touch temporary", () => {
      const result = ApplyResourcePoolChange(6, 0, 20, -3);
      expect(result).toEqual({ current: 9, temporary: 0 });
    });

    test("clamps current at 0 when spending beyond current and temporary", () => {
      const result = ApplyResourcePoolChange(2, 0, 20, 5);
      expect(result).toEqual({ current: 0, temporary: 0 });
    });

    test("clamps current at max when restoring beyond full", () => {
      const result = ApplyResourcePoolChange(15, 0, 20, -100);
      expect(result).toEqual({ current: 20, temporary: 0 });
    });
  });

  describe("positiveAmountIncreasesCurrent: true (Wounds convention)", () => {
    test("a positive amount is absorbed by temporary first when it covers the amount", () => {
      const result = ApplyResourcePoolChange(0, 2, 5, 2, true);
      expect(result).toEqual({ current: 0, temporary: 0 });
    });

    test("spills over into current once temporary is exhausted", () => {
      const result = ApplyResourcePoolChange(0, 0, 5, 2, true);
      expect(result).toEqual({ current: 2, temporary: 0 });
    });

    test("a negative amount (healing) does not touch temporary", () => {
      const result = ApplyResourcePoolChange(2, 0, 5, -1, true);
      expect(result).toEqual({ current: 1, temporary: 0 });
    });

    test("clamps current at max when adding beyond max", () => {
      const result = ApplyResourcePoolChange(4, 0, 5, 5, true);
      expect(result).toEqual({ current: 5, temporary: 0 });
    });

    test("clamps current at 0 when healing beyond empty", () => {
      const result = ApplyResourcePoolChange(1, 0, 5, -100, true);
      expect(result).toEqual({ current: 0, temporary: 0 });
    });
  });
});
