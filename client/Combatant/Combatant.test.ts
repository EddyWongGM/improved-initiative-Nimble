import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { ToPlayerViewCombatantState } from "./ToPlayerViewCombatantState";

describe("Combatant", () => {
  let encounter: Encounter;
  beforeEach(() => {
    InitializeTestSettings();
    encounter = buildEncounter();
  });

  test("Should have its Max HP set from the statblock", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      HP: { Value: 10, Notes: "" }
    });

    expect(combatant.MaxHP()).toBe(10);
  });

  test("Should update its Max HP when its statblock is updated", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Player: "player"
    });

    combatant.StatBlock({
      ...StatBlock.Default(),
      HP: { Value: 15, Notes: "" }
    });
    expect(combatant.MaxHP()).toBe(15);
  });

  test("Should notify the encounter when its statblock is updated", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Player: "player"
    });
    const combatantsSpy = jest.fn();
    encounter.Combatants.subscribe(combatantsSpy);

    combatant.StatBlock({
      ...StatBlock.Default(),
      HP: { Value: 15, Notes: "" }
    });
    expect(combatantsSpy).toBeCalled();
  });

  describe("Temporary resource pools", () => {
    test("ApplyTemporaryMana does not stack, takes the higher value", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });

      combatant.ApplyTemporaryMana(5);
      combatant.ApplyTemporaryMana(3);
      expect(combatant.TemporaryMana()).toBe(5);

      combatant.ApplyTemporaryMana(8);
      expect(combatant.TemporaryMana()).toBe(8);
    });

    test("ApplyManaChange spends from TemporaryMana first, then spills over", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(10);
      combatant.ApplyTemporaryMana(5);

      combatant.ApplyManaChange(3);
      expect(combatant.TemporaryMana()).toBe(2);
      expect(combatant.CurrentMana()).toBe(10);

      combatant.ApplyManaChange(6);
      expect(combatant.TemporaryMana()).toBe(0);
      expect(combatant.CurrentMana()).toBe(6);
    });

    test("ApplyManaChange restoring mana does not touch TemporaryMana", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(4);
      combatant.ApplyTemporaryMana(5);

      combatant.ApplyManaChange(-3);
      expect(combatant.TemporaryMana()).toBe(5);
      expect(combatant.CurrentMana()).toBe(7);
    });

    test("ApplyWoundsChange absorbs incoming wounds into TemporaryWounds before CurrentWounds rises", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        Wounds: { Value: 5, Notes: "" }
      });
      combatant.ApplyTemporaryWounds(3);

      combatant.ApplyWoundsChange(2);
      expect(combatant.TemporaryWounds()).toBe(1);
      expect(combatant.CurrentWounds()).toBe(0);

      combatant.ApplyWoundsChange(2);
      expect(combatant.TemporaryWounds()).toBe(0);
      expect(combatant.CurrentWounds()).toBe(1);
    });
  });

  describe("ToPlayerViewCombatantState", () => {
    test("Should show full HP for player characters", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      const playerViewCombatantState = ToPlayerViewCombatantState(combatant);
      expect(playerViewCombatantState.HPDisplay).toEqual("1/1");
    });

    test("Should show qualitative HP for creatures", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default()
      });
      const playerViewCombatantState = ToPlayerViewCombatantState(combatant);
      expect(playerViewCombatantState.HPDisplay).toEqual(
        "<span class='healthyHP'>Healthy</span>"
      );
    });
  });
});
