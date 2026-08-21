import * as React from "react";

import { Field } from "formik";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface RestoreHitDiceModel {
  restoreAmount: string;
}

export const RestoreHitDicePrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedRestore: string,
  logHitDiceChange: (amount: number, combatantNames: string) => void
): PromptProps<RestoreHitDiceModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: RestoreHitDiceModel) => {
      const restoreAmount = parseInt(model.restoreAmount);
      if (isNaN(restoreAmount)) {
        return false;
      }

      logHitDiceChange(-restoreAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyHitDiceChange("-" + model.restoreAmount)
      );
      return true;
    },

    initialValues: { restoreAmount: suggestedRestore },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout label={`Restore Hit Dice for ${combatantNames}:`}>
        <Field type="number" className="autofocus" name="restoreAmount" />
      </StandardPromptLayout>
    )
  };
};
