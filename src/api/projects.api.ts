import client from './client';

export const projectsApi = {
  getAll: (includeDeleted = false) => client.get('/projects', { params: { includeDeleted } }),
  getTrash: () => client.get('/projects/trash'),
  getById: (id: number) => client.get(`/projects/${id}`),
  create: (data: any) => client.post('/projects', data),
  update: (id: number, data: any) => client.patch(`/projects/${id}`, data),
  delete: (id: number) => client.delete(`/projects/${id}`),
  restore: (id: number) => client.patch(`/projects/${id}/restore`),
  forceDelete: (id: number) => client.delete(`/projects/${id}/force`),
};

