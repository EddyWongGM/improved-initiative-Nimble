import { Field } from "formik";
import * as React from "react";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface ApplyGoldModel {
  goldAmount: string;
}

export const ApplyGoldPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedGold: string,
  logGoldChange: (amount: number, combatantNames: string) => void
): PromptProps<ApplyGoldModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: ApplyGoldModel) => {
      const goldAmount = parseInt(model.goldAmount);
      if (isNaN(goldAmount)) {
        return true;
      }

      logGoldChange(goldAmount, combatantNames);

      combatantViewModels.forEach(c => c.ApplyGoldChange(model.goldAmount));
      return true;
    },

    initialValues: { goldAmount: suggestedGold },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout
        className="p-apply-gold"
        label={`Add or subtract gold for ${combatantNames}`}
      >
        <Field type="number" className="autofocus" name="goldAmount" />
      </StandardPromptLayout>
    )
  };
};
