import * as React from "react";

import { CombatantState } from "../../common/CombatantState";
import { EncounterState } from "../../common/EncounterState";
import { StatBlock } from "../../common/StatBlock";
import { Button } from "../Components/Button";
import { CombatantRow } from "./CombatantRow";
import { CommandContext } from "./CommandContext";
import { InitiativeListHeader } from "./InitiativeListHeader";
import { RestoreCombatants } from "./RestoreCombatants";

export function InitiativeList(props: {
  encounterState: EncounterState<CombatantState>;
  selectedCombatantIds: string[];
  combatantCountsByName: { [name: string]: number };
}) {
  const commandContext = React.useContext(CommandContext);
  const encounterState = props.encounterState;
  const showManaColumn = encounterState.Combatants.some(
    c => c.StatBlock.Mana
  );
  const showResourcesColumn = encounterState.Combatants.some(
    c => c.StatBlock.Resources
  );
  const showHitDiceColumn = encounterState.Combatants.some(
    c => c.StatBlock.HitDice
  );
  const showWoundsColumn = encounterState.Combatants.some(
    c => c.StatBlock.Wounds && StatBlock.IsPlayerCharacter(c.StatBlock)
  );
  const showGoldColumn = encounterState.Combatants.some(c =>
    StatBlock.IsPlayerCharacter(c.StatBlock)
  );
  const anyHasTakenTurn = encounterState.Combatants.some(c => c.HasTakenTurn);

  return (
    <div className="initiative-list">
      <div className="initiative-list__header">
        <h2>Names by Initiative</h2>
        {anyHasTakenTurn && (
          <Button
            text="Reset Turns"
            tooltip="Uncheck 'has taken turn' for everyone"
            onClick={commandContext.ResetHasTakenTurnForAllCombatants}
          />
        )}
      </div>
      <table className="combatants">
        <InitiativeListHeader
          encounterActive={encounterState.ActiveCombatantId != null}
          showManaColumn={showManaColumn}
          showResourcesColumn={showResourcesColumn}
          showHitDiceColumn={showHitDiceColumn}
          showWoundsColumn={showWoundsColumn}
          showGoldColumn={showGoldColumn}
        />
        <tbody>
          {encounterState.Combatants.map((combatantState, index) => {
            const siblingCount =
              props.combatantCountsByName[combatantState.StatBlock.Name] || 1;

            return (
              <CombatantRow
                key={combatantState.Id}
                combatantState={combatantState}
                isActive={encounterState.ActiveCombatantId == combatantState.Id}
                isSelected={props.selectedCombatantIds.some(
                  id => id == combatantState.Id
                )}
                // Show index labels if the encounter has ever had more than one
                // creature with this name.
                showIndexLabel={siblingCount > 1}
                initiativeIndex={index}
                showManaColumn={showManaColumn}
                showResourcesColumn={showResourcesColumn}
                showHitDiceColumn={showHitDiceColumn}
                showWoundsColumn={showWoundsColumn}
                showGoldColumn={showGoldColumn}
              />
            );
          })}
        </tbody>
      </table>
      <RestoreCombatants />
    </div>
  );
}
