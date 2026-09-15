import client from './client';

// Backend DTO (gantt.dto.ts) expects: titulo, tipo, status, color, startDate, endDate
// (camelCase, full ISO datetime strings) — GanttModal sends title/type/start_date/end_date.
const toGanttPayload = (data: any) => {
  const titulo = data.titulo ?? data.title;
  const tipo = data.tipo ?? data.type;
  const startDateRaw = data.startDate ?? data.start_date;
  const endDateRaw = data.endDate ?? data.end_date;

  const payload: any = {};
  if (titulo !== undefined) payload.titulo = titulo;
  if (tipo !== undefined) payload.tipo = tipo;
  if (data.status !== undefined) payload.status = data.status;
  if (data.color !== undefined) payload.color = data.color;
  if (startDateRaw) payload.startDate = new Date(startDateRaw).toISOString();
  if (endDateRaw) payload.endDate = new Date(endDateRaw).toISOString();

  return payload;
};

export const ganttApi = {
  getAll: (params?: any) => client.get('/gantt', { params }),
  getOne: (id: number) => client.get(`/gantt/${id}`),
  create: (data: any) => client.post('/gantt', toGanttPayload(data)),
  update: (id: number, data: any) => client.patch(`/gantt/${id}`, toGanttPayload(data)),
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
