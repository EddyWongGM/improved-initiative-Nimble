import { TagState } from "./CombatantState";

export interface PlayerViewCombatantState {
  Name: string;
  HPDisplay: string;
  HPColor: string;
  ManaDisplay?: string;
  ManaColor?: string;
  ResourcesDisplay?: string;
  ResourcesColor?: string;
  WoundsDisplay?: string;
  WoundsColor?: string;
  GoldDisplay?: string;
  Initiative: number;
  Id: string;
  Tags: TagState[];
  IsPlayerCharacter: boolean;
  ImageURL: string;
  AC?: number;
  Color?: string;
  ReactionsSpent?: number;
  HasTakenTurn?: boolean;
}
