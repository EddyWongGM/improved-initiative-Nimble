import * as React from "react";
import { PromptProps } from "./PendingPrompts";
import { Field } from "formik";
import { StandardPromptLayout } from "./StandardPromptLayout";

type ApplyTemporaryHitDiceModel = { hitDiceAmount: number };

export function ApplyTemporaryHitDicePrompt(
  combatantNames: string,
  applyHitDice: (model: ApplyTemporaryHitDiceModel) => boolean
): PromptProps<ApplyTemporaryHitDiceModel> {
  return {
    onSubmit: applyHitDice,
    initialValues: { hitDiceAmount: 0 },
    autoFocusSelector: ".response",
    children: (
      <StandardPromptLayout
        className="p-apply-temporary-hit-dice"
        label={`Grant temporary hit dice to ${combatantNames}: `}
      >
        <Field name="hitDiceAmount" className="response" type="number" />
      </StandardPromptLayout>
    )
  };
}
