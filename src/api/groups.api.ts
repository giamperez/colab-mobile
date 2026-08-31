import client from './client';

export const groupsApi = {
  getAll: () => client.get('/groups'),
  create: (data: any) => client.post('/groups', data),
  update: (id: number, data: any) => client.patch(`/groups/${id}`, data),
  remove: (id: number) => client.delete(`/groups/${id}`),

  // Miembros
  getMembers: (groupId: number) => client.get(`/groups/${groupId}/miembros`),
  addMember: (groupId: number, data: { userId: number; esJefe?: boolean }) =>
    client.post(`/groups/${groupId}/miembros`, data),
  updateMember: (groupId: number, userId: number, data: { esJefe: boolean }) =>
    client.patch(`/groups/${groupId}/miembros/${userId}`, data),
  removeMember: (groupId: number, userId: number) =>
    client.delete(`/groups/${groupId}/miembros/${userId}`),
};
