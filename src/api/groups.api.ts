import client from './client';

export const groupsApi = {
  getAll: () => client.get('/groups'),
  create: (data: any) => client.post('/groups', data),
  update: (id: number, data: any) => client.patch(`/groups/${id}`, data),
  remove: (id: number) => client.delete(`/groups/${id}`),
};
