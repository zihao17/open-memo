export interface ApiBootstrapStatus {
  readonly service: "api";
  readonly ready: boolean;
  readonly scope: "bootstrap";
}

export const apiBootstrapStatus: ApiBootstrapStatus = {
  service: "api",
  ready: false,
  scope: "bootstrap"
};
