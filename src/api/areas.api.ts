import client from './client';

export const areasApi = {
  getAll: () => client.get('/areas'),
  getById: (id: number) => client.get(`/areas/${id}`),
  create: (data: any) => client.post('/areas', data),
  update: (id: number, data: any) => client.patch(`/areas/${id}`, data),
  delete: (id: number) => client.delete(`/areas/${id}`),
};
