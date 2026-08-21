import * as React from "react";
import { PromptProps } from "./PendingPrompts";
import { Field } from "formik";
import { StandardPromptLayout } from "./StandardPromptLayout";

type ApplyTemporaryManaModel = { manaAmount: number };

export function ApplyTemporaryManaPrompt(
  combatantNames: string,
  applyMana: (model: ApplyTemporaryManaModel) => boolean
): PromptProps<ApplyTemporaryManaModel> {
  return {
    onSubmit: applyMana,
    initialValues: { manaAmount: 0 },
    autoFocusSelector: ".response",
    children: (
      <StandardPromptLayout
        className="p-apply-temporary-mana"
        label={`Grant temporary mana to ${combatantNames}: `}
      >
        <Field name="manaAmount" className="response" type="number" />
      </StandardPromptLayout>
    )
  };
}
