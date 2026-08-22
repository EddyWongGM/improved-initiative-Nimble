import * as React from "react";
import { PromptProps } from "./PendingPrompts";
import { Field } from "formik";
import { StandardPromptLayout } from "./StandardPromptLayout";

type ApplyTemporaryResourcesModel = { resourcesAmount: number };

export function ApplyTemporaryResourcesPrompt(
  combatantNames: string,
  applyResources: (model: ApplyTemporaryResourcesModel) => boolean
): PromptProps<ApplyTemporaryResourcesModel> {
  return {
    onSubmit: applyResources,
    initialValues: { resourcesAmount: 0 },
    autoFocusSelector: ".response",
    children: (
      <StandardPromptLayout
        className="p-apply-temporary-resources"
        label={`Grant temporary resources to ${combatantNames}: `}
      >
        <Field name="resourcesAmount" className="response" type="number" />
      </StandardPromptLayout>
    )
  };
}
