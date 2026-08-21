import { TagState } from "./CombatantState";

export interface PlayerViewCombatantState {
  Name: string;
  HPDisplay: string;
  HPColor: string;
  ManaDisplay?: string;
  ManaColor?: string;
  WoundsDisplay?: string;
  WoundsColor?: string;
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
