import { InventoryItem } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { DefaultRules } from "../Rules/Rules";

const BaseInventorySlots = 10;
const rules = new DefaultRules();

export function GetMaxInventorySlots(statBlock: StatBlock): number {
  return (
    BaseInventorySlots + rules.GetModifierFromScore(statBlock.Abilities.Str)
  );
}

export function GetInventorySlotsUsed(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + item.SlotCost, 0);
}
