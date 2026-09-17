import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from './authEvents';

const globalProcess = (globalThis as any).process;
const EXPO_PUBLIC_API_URL =
  globalProcess?.env?.EXPO_PUBLIC_API_URL ||
  'https://colab.vertexdev.tech/api';

const client = axios.create({
  baseURL: EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('Error reading token from AsyncStorage:', err);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isRefreshCall && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await client.post('/auth/refresh');
        if (data?.access_token) {
          await AsyncStorage.setItem('token', data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return client(originalRequest);
        }
      } catch (refreshErr) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        authEvents.emitForceLogout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
