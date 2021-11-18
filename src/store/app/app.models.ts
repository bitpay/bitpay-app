export interface Session {
  csrfToken: string;
  isAuthenticated: boolean;
}

export interface AppIdentity {
  created?: number;
  priv: string | Uint8Array;
  pub: string | Uint8Array;
  sin: string;
}
