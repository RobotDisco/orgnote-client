import type { OrgNoteApi } from 'orgnote-api';

export const isNotAuthenticated = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !auth.user;
};

export const isNotActiveUser = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !auth.user || !auth.user.active;
};

export const isAuthenticated = (api: OrgNoteApi): boolean => {
  const auth = api.core.useAuth();
  return !!auth.user;
};
