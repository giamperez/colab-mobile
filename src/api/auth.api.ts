import client from './client';

export const authApi = {
  login: (data: { email?: string; password?: string; pin?: string; dni?: string }) =>
    client.post('/auth/login', data),
  register: (data: any) =>
    client.post('/auth/register', data),
  refresh: () =>
    client.post('/auth/refresh'),
  changePin: (data: { current_pin: string; new_pin: string }) =>
    client.patch('/auth/change-pin', data),
  me: () => client.get('/auth/me'),
  switchCompany: (companyId: number) =>
    client.post('/auth/switch-company', { companyId }),
};
