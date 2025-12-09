export interface AuthState {
  environment: string;
  redirectUrl?: string;
}

const DEFAULT_AUTH_STATE: AuthState = { environment: 'desktop' };

export const decodeAuthState = (state: string): AuthState => {
  if (!state) {
    return DEFAULT_AUTH_STATE;
  }
  try {
    return JSON.parse(state) as AuthState;
  } catch {
    return DEFAULT_AUTH_STATE;
  }
};

export const encodeAuthState = (state: AuthState): string => {
  return JSON.stringify(state);
};
