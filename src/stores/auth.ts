import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  RouteNames,
  RoutePaths,
  type AuthStore,
  type PersonalInfo,
  type OAuthProvider,
} from 'orgnote-api';

import { encodeAuthState, type AuthState } from 'src/utils/decode-auth-state';
import { sdk } from 'src/boot/axios';
import { to } from 'src/utils/to-error';
import { platformSpecificValue } from 'src/utils/platform-specific-value';
import { platformMatch } from 'src/utils/platform-detection';

declare const electron: { auth: (url: string) => Promise<{ redirectUrl: string }> } | undefined;

interface AuthParams {
  provider: string;
  environment?: string;
  redirectUrl?: string;
}

export const useAuthStore = defineStore<'auth', AuthStore>(
  'auth',
  (): AuthStore => {
    const token = ref<string>('');
    const user = ref<PersonalInfo | null>(null);
    const provider = ref<OAuthProvider>('github');

    const router = useRouter();

    const resetAuthInfo = () => {
      user.value = null;
      token.value = '';
    };

    const getEnvironment = (): string =>
      platformSpecificValue({
        nativeMobile: 'mobile',
        electron: 'electron',
        data: 'web',
      });

    const getAuthUrl = (authProvider: string, state: AuthState): string => {
      const strState = encodeURIComponent(encodeAuthState(state));
      const baseUrl = import.meta.env.VITE_AUTH_URL || '';
      return `${baseUrl}/${RoutePaths.AUTH_LOGIN}/${authProvider}?state=${strState}`;
    };

    const authViaNativeMobile = (authUrl: string): void => {
      window.open(authUrl, '_system');
    };

    const authViaElectron = async (authUrl: string): Promise<void> => {
      if (typeof electron === 'undefined') {
        return;
      }
      const { redirectUrl } = await electron.auth(authUrl);
      router.push(redirectUrl);
    };

    const authViaWeb = async (authProvider: string, state: AuthState): Promise<void> => {
      const response = await sdk.auth.authProviderLoginGet(authProvider, encodeAuthState(state));
      const redirectUrl = response.data.data?.redirectUrl;
      if (redirectUrl) {
        window.location.replace(redirectUrl);
      }
    };

    const auth = async (params: AuthParams): Promise<void> => {
      if (!process.env.CLIENT) {
        return;
      }

      const state: AuthState = {
        environment: params.environment ?? getEnvironment(),
        redirectUrl: params.redirectUrl,
      };
      const authUrl = getAuthUrl(params.provider, state);

      await platformMatch({
        nativeMobile: () => authViaNativeMobile(authUrl),
        electron: () => authViaElectron(authUrl),
        default: () => authViaWeb(params.provider, state),
      });
    };

    const authViaGithub = async (redirectUrl: string): Promise<void> => {
      await to(() => auth({ provider: provider.value ?? 'github', redirectUrl }))();
    };
    const isAuthError = (error: unknown): boolean => {
      const axiosError = error as { response?: { status: number } };
      const status = axiosError.response?.status;
      return status === 400 || status === 401;
    };

    const handleVerifyError = (error: unknown): void => {
      if (isAuthError(error)) {
        resetAuthInfo();
      }
    };

    const updateUserFromResponse = (userData: PersonalInfo | undefined): void => {
      if (!userData) {
        return;
      }
      user.value = userData;
    };

    const shouldSkipVerification = (): boolean => {
      return !process.env.CLIENT || !token.value;
    };

    const verifyUser = async (): Promise<void> => {
      if (shouldSkipVerification()) {
        resetAuthInfo();
        return;
      }

      const result = await to(() => sdk.auth.authVerifyGet())();

      if (result.isErr()) {
        handleVerifyError(result.error);
        return;
      }

      updateUserFromResponse(result.value.data.data);
    };

    const authUser = async (u: PersonalInfo, t: string): Promise<void> => {
      user.value = u;
      token.value = t;
    };

    const logout = async (): Promise<void> => {
      await to(() => sdk.auth.authLogoutGet())();
      resetAuthInfo();
      router.push({ name: RouteNames.Home });
    };

    const subscribe = async (subscriptionToken: string, email?: string): Promise<void> => {
      await sdk.auth.authSubscribePost({ token: subscriptionToken, email });
      await verifyUser();
    };

    const removeUserAccount = async (): Promise<void> => {
      if (user.value) {
        await sdk.auth.authAccountDelete();
      }
      localStorage.clear();
      router.push({ name: RouteNames.Home });
      window.location.reload();
    };

    return {
      token,
      user,
      provider,
      auth,
      authViaGithub,
      verifyUser,
      authUser,
      logout,
      subscribe,
      removeUserAccount,
    };
  },
  { persist: true },
);
