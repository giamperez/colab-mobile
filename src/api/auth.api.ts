import client from './client';

export const authApi = {
  login: (data: { email?: string; password?: string; dni?: string; pin?: string }) =>
    client.post('/auth/login', data),
  register: (data: any) => client.post('/auth/register', data),
  changePin: (data: { current_pin: string; new_pin: string }) => client.patch('/auth/change-pin', data),
};
