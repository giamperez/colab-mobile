import client from './client';

export const tasksApi = {
  getAll: (params?: any) => client.get('/tasks', { params }),
  getOne: (id: number) => client.get(`/tasks/${id}`),
  create: (data: any) => client.post('/tasks', data),
  update: (id: number, data: any) => client.patch(`/tasks/${id}`, data),
  updateStatus: (id: number, status: string, description?: string) =>
    client.patch(`/tasks/${id}/status`, { status, description }),
  remove: (id: number) => client.delete(`/tasks/${id}`),
};
