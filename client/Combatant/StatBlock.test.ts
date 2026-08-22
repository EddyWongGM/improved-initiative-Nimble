import { StatBlock } from "../../common/StatBlock";

describe("StatBlock", () => {
  describe("IsPlayerCharacter", () => {
    test("is true only for Player == 'player'", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "player" })
      ).toBe(true);
    });

    test("is false for a monster/NPC (empty Player)", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });

    test("is false for a companion", () => {
      expect(
        StatBlock.IsPlayerCharacter({
          ...StatBlock.Default(),
          Player: "companion"
        })
      ).toBe(false);
    });

    test("is false for the legacy 'npc' value", () => {
      expect(
        StatBlock.IsPlayerCharacter({ ...StatBlock.Default(), Player: "npc" })
      ).toBe(false);
    });
  });

  describe("IsCompanion", () => {
    test("is true only for Player == 'companion'", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "companion" })
      ).toBe(true);
    });

    test("is false for a player character", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "player" })
      ).toBe(false);
    });

    test("is false for a monster/NPC (empty Player)", () => {
      expect(
        StatBlock.IsCompanion({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });
  });

  describe("ActsInPlayerPhase", () => {
    test("is true for a player character", () => {
      expect(
        StatBlock.ActsInPlayerPhase({ ...StatBlock.Default(), Player: "player" })
      ).toBe(true);
    });

    test("is true for a companion", () => {
      expect(
        StatBlock.ActsInPlayerPhase({
          ...StatBlock.Default(),
          Player: "companion"
        })
      ).toBe(true);
    });

    test("is false for a monster/NPC", () => {
      expect(
        StatBlock.ActsInPlayerPhase({ ...StatBlock.Default(), Player: "" })
      ).toBe(false);
    });
  });
});
