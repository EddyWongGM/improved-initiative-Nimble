import { CombatStats } from "./CombatStats";
import { EncounterState } from "./EncounterState";
import { InventoryDisplayPayload } from "./InventoryDisplay";
import { PlayerViewCombatantState } from "./PlayerViewCombatantState";
import { PlayerViewSettings } from "./PlayerViewSettings";

export interface PlayerViewState {
  encounterState: EncounterState<PlayerViewCombatantState> | null;
  settings: PlayerViewSettings | null;
  combatStats?: CombatStats | null;
  inventoryDisplay?: InventoryDisplayPayload | null;
}
