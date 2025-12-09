export interface AuthState {
  environment: string;
  redirectUrl?: string;
}

export const decodeAuthState = (state: string): AuthState => {
  if (!state) {
    return { environment: 'desktop' };
  }
  return JSON.parse(state) as AuthState;
};

export const encodeAuthState = (state: AuthState): string => {
  return JSON.stringify(state);
};
