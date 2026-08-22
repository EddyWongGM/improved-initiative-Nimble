import * as React from "react";
import { PromptProps } from "./PendingPrompts";
import { Field } from "formik";
import { StandardPromptLayout } from "./StandardPromptLayout";

type ApplyTemporaryWoundsModel = { woundsAmount: number };

export function ApplyTemporaryWoundsPrompt(
  combatantNames: string,
  applyWounds: (model: ApplyTemporaryWoundsModel) => boolean
): PromptProps<ApplyTemporaryWoundsModel> {
  return {
    onSubmit: applyWounds,
    initialValues: { woundsAmount: 0 },
    autoFocusSelector: ".response",
    children: (
      <StandardPromptLayout
        className="p-apply-temporary-wounds"
        label={`Grant wound protection to ${combatantNames}: `}
      >
        <Field name="woundsAmount" className="response" type="number" />
      </StandardPromptLayout>
    )
  };
}
