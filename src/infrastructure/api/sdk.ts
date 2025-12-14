import type { AxiosInstance } from 'axios';
import { AuthApiFactory, SyncApiFactory } from 'orgnote-api/remote-api';

export interface Sdk {
  auth: ReturnType<typeof AuthApiFactory>;
  sync: ReturnType<typeof SyncApiFactory>;
}

export const createSdk = (axiosInstance: AxiosInstance): Sdk => ({
  auth: AuthApiFactory(undefined, '', axiosInstance),
  sync: SyncApiFactory(undefined, '', axiosInstance),
});
