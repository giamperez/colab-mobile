import client from './client';

export const ganttApi = {
  getAll: (params?: any) => client.get('/gantt', { params }),
  getOne: (id: number) => client.get(`/gantt/${id}`),
  create: (data: any) => client.post('/gantt', data),
  update: (id: number, data: any) => client.patch(`/gantt/${id}`, data),
  remove: (id: number) => client.delete(`/gantt/${id}`),
  createSubtask: (ganttId: number, data: any) =>
    client.post(`/gantt/${ganttId}/subtasks`, data),
  updateSubtask: (ganttId: number, taskId: number, data: any) =>
    client.patch(`/gantt/${ganttId}/subtasks/${taskId}`, data),
  toggleSubtask: (ganttId: number, taskId: number) =>
    client.patch(`/gantt/${ganttId}/subtasks/${taskId}/toggle`, {}),
  deleteSubtask: (ganttId: number, taskId: number) =>
    client.delete(`/gantt/${ganttId}/subtasks/${taskId}`),
  duplicate: (id: number) => client.post(`/gantt/${id}/duplicate`, {}),
};
