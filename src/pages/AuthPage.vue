<template>
  <div v-if="mobileRedirectUrl" class="auth-page absolute-center">
    <a :href="mobileRedirectUrl">{{ $t(I18N.AUTH_RETURN_TO_MOBILE) }}</a>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { decodeAuthState, type AuthState } from 'src/utils/decode-auth-state';
import { extractAuthQueryInfo } from 'src/utils/extract-auth-query-info';
import { RouteNames, RoutePaths, I18N } from 'orgnote-api';
import { isValidAuthProvider } from 'src/utils/is-valid-auth-provider';
import { useSplashScreen } from 'src/composables/use-splash-screen';
import { platform } from 'src/utils/platform-detection';
import { useI18n } from 'vue-i18n';
import { buildOrgNoteUrl } from 'src/utils/build-orgnote-url';
import { useAuthStore } from 'src/stores/auth';
import { to } from 'src/utils/to-error';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const splashScreen = useSplashScreen();
const { t } = useI18n();

const mobileRedirectUrl = ref<string>();

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const initialProvider = computed(() => {
  const provider = route.params.initialProvider;
  if (isValidAuthProvider(provider)) {
    return provider;
  }
  return undefined;
});

const stateFromQuery = computed<AuthState>(() => decodeAuthState(asString(route.query.state)));

const isStandalone = (): boolean =>
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const shouldRedirectToMobileApp = (isMobileEnvironment: boolean): boolean =>
  !platform.is.nativeMobile &&
  platform.is.mobile &&
  isMobileEnvironment &&
  !isStandalone() &&
  !platform.is.ios;

const handleError = (e: unknown): void => {
  splashScreen.hide();

  const message = e instanceof Error ? e.message : String(e);
  router.push({ name: RouteNames.Home, query: { error: message } });
};

const initiateOAuth = async (): Promise<void> => {
  if (!initialProvider.value) {
    return;
  }
  await authStore.auth({
    provider: initialProvider.value,
    environment: stateFromQuery.value.environment,
    redirectUrl: stateFromQuery.value.redirectUrl ?? '',
  });
};

const handleMobileRedirect = (): boolean => {
  const isMobileEnvironment = stateFromQuery.value.environment === 'mobile';

  if (!shouldRedirectToMobileApp(isMobileEnvironment)) {
    return false;
  }

  const queryParams = Object.fromEntries(new URLSearchParams(window.location.search));
  const url = buildOrgNoteUrl(RoutePaths.AUTH_LOGIN, { target: 'native-app', query: queryParams });
  mobileRedirectUrl.value = url;
  splashScreen.hide();
  window.location.assign(url);
  return true;
};

const isValidAuthCallback = (query: Record<string, string>): boolean =>
  Boolean(query.token && query.id);

const completeAuth = async (): Promise<void> => {
  const query = route.query as Record<string, string>;

  if (!isValidAuthCallback(query)) {
    router.push({ name: RouteNames.Home, query: { error: t(I18N.AUTH_INVALID_CALLBACK_PARAMS) } });
    return;
  }

  const personalInfo = extractAuthQueryInfo(query);
  const token = asString(route.query.token);

  await authStore.authUser(personalInfo, token);

  splashScreen.hide();

  const state = stateFromQuery.value;
  if (state.redirectUrl) {
    window.location.assign(state.redirectUrl);
    return;
  }

  router.push({ name: RouteNames.Home });
};

const setupUser = async (): Promise<void> => {
  if (handleMobileRedirect()) {
    return;
  }
  await completeAuth();
};

const processAuth = async (): Promise<void> => {
  if (initialProvider.value) {
    await initiateOAuth();
    return;
  }
  await setupUser();
};

onMounted(async () => {
  splashScreen.show({ preparationText: t(I18N.AUTH_IDENTIFYING) });

  const result = await to(processAuth)();
  if (result.isErr()) {
    handleError(result.error);
  }
});

onUnmounted(() => {
  splashScreen.hide();
});
</script>
