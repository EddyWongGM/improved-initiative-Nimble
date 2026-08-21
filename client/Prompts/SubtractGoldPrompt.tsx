import * as React from "react";

import { Field } from "formik";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface SubtractGoldModel {
  subtractAmount: string;
}

export const SubtractGoldPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedSubtract: string,
  logGoldChange: (amount: number, combatantNames: string) => void
): PromptProps<SubtractGoldModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: SubtractGoldModel) => {
      const subtractAmount = parseInt(model.subtractAmount);
      if (isNaN(subtractAmount)) {
        return false;
      }

      logGoldChange(-subtractAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyGoldChange("-" + model.subtractAmount)
      );
      return true;
    },

    initialValues: { subtractAmount: suggestedSubtract },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout label={`Subtract gold for ${combatantNames}:`}>
        <Field type="number" className="autofocus" name="subtractAmount" />
      </StandardPromptLayout>
    )
  };
};
