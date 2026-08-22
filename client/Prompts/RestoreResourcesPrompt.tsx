import * as React from "react";

import { Field } from "formik";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface RestoreResourcesModel {
  restoreAmount: string;
}

export const RestoreResourcesPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedRestore: string,
  logResourcesChange: (amount: number, combatantNames: string) => void
): PromptProps<RestoreResourcesModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: RestoreResourcesModel) => {
      const restoreAmount = parseInt(model.restoreAmount);
      if (isNaN(restoreAmount)) {
        return true;
      }

      logResourcesChange(-restoreAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyResourcesChange("-" + model.restoreAmount)
      );
      return true;
    },

    initialValues: { restoreAmount: suggestedRestore },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout label={`Restore resources for ${combatantNames}:`}>
        <Field type="number" className="autofocus" name="restoreAmount" />
      </StandardPromptLayout>
    )
  };
};
