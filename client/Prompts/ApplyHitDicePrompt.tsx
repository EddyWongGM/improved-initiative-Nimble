import { Field } from "formik";
import * as React from "react";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface ApplyHitDiceModel {
  hitDiceAmount: string;
}

export const ApplyHitDicePrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedHitDice: string,
  logHitDiceChange: (amount: number, combatantNames: string) => void
): PromptProps<ApplyHitDiceModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: ApplyHitDiceModel) => {
      const hitDiceAmount = parseInt(model.hitDiceAmount);
      if (isNaN(hitDiceAmount)) {
        return true;
      }

      logHitDiceChange(hitDiceAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyHitDiceChange(model.hitDiceAmount)
      );
      return true;
    },

    initialValues: { hitDiceAmount: suggestedHitDice },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout
        className="p-apply-hit-dice"
        label={`Spend or restore Hit Dice for ${combatantNames}`}
      >
        <Field type="number" className="autofocus" name="hitDiceAmount" />
      </StandardPromptLayout>
    )
  };
};
