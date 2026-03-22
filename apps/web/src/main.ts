export interface WebBootstrapStatus {
  readonly service: "web";
  readonly ready: boolean;
  readonly scope: "bootstrap";
}

export const webBootstrapStatus: WebBootstrapStatus = {
  service: "web",
  ready: false,
  scope: "bootstrap"
};
