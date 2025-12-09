import type { AxiosInstance } from 'axios';
import { AuthApiFactory, NotesApiFactory } from 'orgnote-api/remote-api';

export interface Sdk {
  auth: ReturnType<typeof AuthApiFactory>;
  notes: ReturnType<typeof NotesApiFactory>;
}

export const createSdk = (axiosInstance: AxiosInstance): Sdk => ({
  auth: AuthApiFactory(undefined, '', axiosInstance),
  notes: NotesApiFactory(undefined, '', axiosInstance),
});
