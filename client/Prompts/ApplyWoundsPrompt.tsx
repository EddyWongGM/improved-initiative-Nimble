import { Field } from "formik";
import * as React from "react";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface ApplyWoundsModel {
  woundsAmount: string;
}

export const ApplyWoundsPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedWounds: string,
  logWoundsChange: (amount: number, combatantNames: string) => void
): PromptProps<ApplyWoundsModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: ApplyWoundsModel) => {
      const woundsAmount = parseInt(model.woundsAmount);
      if (isNaN(woundsAmount)) {
        return true;
      }

      logWoundsChange(woundsAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyWoundsChange(model.woundsAmount)
      );
      return true;
    },

    initialValues: { woundsAmount: suggestedWounds },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout
        className="p-apply-wounds"
        label={`Add or heal wounds for ${combatantNames}`}
      >
        <Field type="number" className="autofocus" name="woundsAmount" />
      </StandardPromptLayout>
    )
  };
};
