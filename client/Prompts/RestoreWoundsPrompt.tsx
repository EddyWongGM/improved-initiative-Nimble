import * as React from "react";

import { Field } from "formik";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface RestoreWoundsModel {
  restoreAmount: string;
}

export const RestoreWoundsPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedRestore: string,
  logWoundsChange: (amount: number, combatantNames: string) => void
): PromptProps<RestoreWoundsModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: RestoreWoundsModel) => {
      const restoreAmount = parseInt(model.restoreAmount);
      if (isNaN(restoreAmount)) {
        return false;
      }

      logWoundsChange(-restoreAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyWoundsChange("-" + model.restoreAmount)
      );
      return true;
    },

    initialValues: { restoreAmount: suggestedRestore },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout label={`Heal wounds for ${combatantNames}:`}>
        <Field type="number" className="autofocus" name="restoreAmount" />
      </StandardPromptLayout>
    )
  };
};
