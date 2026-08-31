import client from './client';

export const membershipsApi = {
  getAll: () => client.get('/memberships'),
  invite: (data: { email: string; rol: string }) => client.post('/memberships/invite', data),
  updateRole: (id: number, rol: string) => client.patch(`/memberships/${id}/rol`, { rol }),
  updateStatus: (id: number, estado: string) => client.patch(`/memberships/${id}/estado`, { estado }),
  delete: (id: number) => client.delete(`/memberships/${id}`),
};
