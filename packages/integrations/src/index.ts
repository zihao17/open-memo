export interface IntegrationsBootstrapBoundary {
  readonly llm: "pending";
  readonly notifier: "pending";
  readonly chatBridge: "pending";
}

export const integrationsBootstrapBoundary: IntegrationsBootstrapBoundary = {
  llm: "pending",
  notifier: "pending",
  chatBridge: "pending"
};
