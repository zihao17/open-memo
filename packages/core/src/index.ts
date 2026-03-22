export interface CoreBootstrapBoundary {
  readonly parser: "pending";
  readonly store: "pending";
  readonly heartbeat: "pending";
  readonly scheduler: "pending";
}

export const coreBootstrapBoundary: CoreBootstrapBoundary = {
  parser: "pending",
  store: "pending",
  heartbeat: "pending",
  scheduler: "pending"
};
