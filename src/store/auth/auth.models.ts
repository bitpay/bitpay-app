export interface Account {
  email: string;
  isVerified: boolean;
}

export interface Session {
  csrfToken: string;
  isAuthenticated: boolean;
}
