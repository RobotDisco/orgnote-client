import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance } from 'axios';
import { createAxiosInstance, createSdk, type Sdk } from 'src/infrastructure/api';
import { useAuthStore } from 'src/stores/auth';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
    $sdk: Sdk;
  }
}

let api: AxiosInstance;
let sdk: Sdk;

export default defineBoot(({ app, store }) => {
  const authStore = useAuthStore(store);

  api = createAxiosInstance(() => authStore.token);
  sdk = createSdk(api);

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
  app.config.globalProperties.$sdk = sdk;
});

export { api, sdk };
