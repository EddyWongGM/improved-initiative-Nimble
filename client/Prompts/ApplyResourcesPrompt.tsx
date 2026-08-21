import { Field } from "formik";
import * as React from "react";

import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

interface ApplyResourcesModel {
  resourcesAmount: string;
}

export const ApplyResourcesPrompt = (
  combatantViewModels: CombatantViewModel[],
  suggestedResources: string,
  logResourcesChange: (amount: number, combatantNames: string) => void
): PromptProps<ApplyResourcesModel> => {
  const combatantNames = combatantViewModels.map(c => c.Name()).join(", ");
  return {
    onSubmit: (model: ApplyResourcesModel) => {
      const resourcesAmount = parseInt(model.resourcesAmount);
      if (isNaN(resourcesAmount)) {
        return false;
      }

      logResourcesChange(resourcesAmount, combatantNames);

      combatantViewModels.forEach(c =>
        c.ApplyResourcesChange(model.resourcesAmount)
      );
      return true;
    },

    initialValues: { resourcesAmount: suggestedResources },

    autoFocusSelector: ".autofocus",

    children: (
      <StandardPromptLayout
        className="p-apply-resources"
        label={`Spend or restore resources for ${combatantNames}`}
      >
        <Field type="number" className="autofocus" name="resourcesAmount" />
      </StandardPromptLayout>
    )
  };
};
