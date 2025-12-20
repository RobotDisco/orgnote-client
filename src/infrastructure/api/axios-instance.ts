import axios, { type AxiosInstance } from 'axios';

export const createAxiosInstance = (getToken: () => string): AxiosInstance => {
  const instance = axios.create({
    baseURL: process.env.API_URL || '/v1',
  });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
};
