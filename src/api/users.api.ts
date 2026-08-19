import client from './client';

export const usersApi = {
  getAll: () => client.get('/users'),
  create: (data: any) => client.post('/users', data),
  update: (id: number, data: any) => client.patch(`/users/${id}`, data),
  remove: (id: number) => client.delete(`/users/${id}`),
};
