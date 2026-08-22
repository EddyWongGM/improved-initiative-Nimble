import { InventoryItem } from "./CombatantState";

export interface InventoryDisplayPayload {
  combatantName: string;
  items: InventoryItem[];
}
