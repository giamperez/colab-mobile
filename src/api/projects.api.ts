import client from './client';

export const projectsApi = {
  getAll: () => client.get('/projects'),
  getById: (id: number) => client.get(`/projects/${id}`),
  create: (data: any) => client.post('/projects', data),
  update: (id: number, data: any) => client.patch(`/projects/${id}`, data),
  delete: (id: number) => client.delete(`/projects/${id}`),
};
