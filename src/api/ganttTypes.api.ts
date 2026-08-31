import client from './client';

export const ganttTypesApi = {
  getAll: () => client.get('/gantt/types').then((res) => res.data),
  create: (data: { nombre: string; color?: string; icono?: string }) =>
    client.post('/gantt/types', data).then((res) => res.data),
  update: (id: number, data: any) =>
    client.patch(`/gantt/types/${id}`, data).then((res) => res.data),
  remove: (id: number) =>
    client.delete(`/gantt/types/${id}`).then((res) => res.data),
};
