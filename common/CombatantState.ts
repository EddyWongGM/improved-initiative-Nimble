import { DurationTiming } from "./DurationTiming";
import { StatBlock } from "./StatBlock";

export interface TagState {
  Text: string;
  DurationRemaining: number;
  DurationTiming: DurationTiming;
  DurationCombatantId: string;
  Hidden?: boolean;
}

export interface CombatantState {
  Id: string;
  StatBlock: StatBlock;
  PersistentCharacterId?: string;
  CurrentHP: number;
  CurrentMana?: number;
  TemporaryMana?: number;
  CurrentResources?: number;
  TemporaryResources?: number;
  CurrentHitDice?: number;
  TemporaryHitDice?: number;
  RevealedHitDice?: boolean;
  CurrentWounds?: number;
  TemporaryWounds?: number;
  CurrentGold?: number;
  RevealedGold?: boolean;
  CurrentNotes?: string;
  Color?: string;
  ReactionsSpent?: number;
  TemporaryHP: number;
  Initiative: number;
  InitiativeGroup?: string;
  Alias: string;
  IndexLabel: number | null;
  Tags: TagState[];
  Hidden: boolean;
  KeepHidden?: boolean;
  RevealedAC: boolean;
  HasTakenTurn?: boolean;
  RoundCounter?: number;
  ElapsedSeconds?: number;
  InterfaceVersion: string;
}
