import client from './client';
import { mapTaskFromBackend } from '../types/task.mapper';
import type { Task } from '../types';
import { triggerTaskCompleted } from '../utils/taskCompletionEvents';

import dayjs from 'dayjs';

// Deduplicates tasks by id — backend may return one row per assignee when a task has multiple responsibles
const deduplicateTasksById = (tasks: Task[]): Task[] => {
  const seen = new Set<number>();
  return tasks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
};

export const tasksApi = {
  getAll: (filters: {
    date?: string;
    from?: string;
    to?: string;
    status?: string;
    assignee_id?: number;
    include_gantt?: boolean;
    includeDeleted?: string;
    groupId?: number;
    vigentes?: boolean;
    overdue_only?: boolean;
  } = {}) =>
    client.get('/tasks', { params: filters }).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return { ...res, data: deduplicateTasksById(raw.map(mapTaskFromBackend) as Task[]) };
    }),

  getCalendarTasks: (from: string, to: string) =>
    client.get('/tasks', { params: { from, to } }).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return { ...res, data: deduplicateTasksById(raw.map(mapTaskFromBackend) as Task[]) };
    }),

  getOne: (id: number) =>
    client.get(`/tasks/${id}`).then((res) => ({ ...res, data: mapTaskFromBackend(res.data) })),

  create: (data: any) => {
    const title = data.title || data.titulo || 'Nueva Tarea';
    const description = data.description || data.descripcion || undefined;
    const assignee_id =
      data.assignee_id ||
      data.responsableId ||
      (data.responsableIds && data.responsableIds[0]) ||
      data.assignee?.id ||
      undefined;
    const category_id = data.category_id || data.categoriaId || data.category?.id || 1;
    const group_id = data.group_id || data.groupId || data.group?.id || undefined;
    const gantt_item_id =
      data.gantt_item_id || data.ganttItemId || data.projectId || undefined;

    // Dates formatted YYYY-MM-DD using local time
    const todayLocal = dayjs().format('YYYY-MM-DD');
    const execDate = data.execution_date
      ? String(data.execution_date).split('T')[0]
      : data.fechaInicio
      ? String(data.fechaInicio).split('T')[0]
      : todayLocal;
    const dueDate = data.due_date
      ? String(data.due_date).split('T')[0]
      : data.fechaVencimiento
      ? String(data.fechaVencimiento).split('T')[0]
      : execDate;

    // Map priority to Backend enum
    const prioRaw = String(data.priority || data.prioridad || 'media').toLowerCase();
    let prioridadEnum = 'MEDIA';
    if (prioRaw === 'muy_alta' || prioRaw === 'urgente') prioridadEnum = 'MUY_ALTA';
    else if (prioRaw === 'alta') prioridadEnum = 'ALTA';
    else if (prioRaw === 'baja') prioridadEnum = 'BAJA';
    else if (prioRaw === 'muy_baja') prioridadEnum = 'MUY_BAJA';

    // Map status to Backend enum
    const statusRaw = String(data.status || data.estado || 'pendiente').toLowerCase();
    let estadoEnum = 'PENDIENTE';
    if (statusRaw === 'en_progreso' || statusRaw === 'en_proceso') estadoEnum = 'EN_PROCESO';
    else if (statusRaw === 'en_revision' || statusRaw === 'en_revisión') estadoEnum = 'EN_REVISION';
    else if (statusRaw === 'bloqueada') estadoEnum = 'BLOQUEADA';
    else if (statusRaw === 'completada') estadoEnum = 'COMPLETADA';

    const payload: any = {
      // English fields
      title,
      description,
      assignee_id,
      category_id,
      group_id,
      gantt_item_id,
      execution_date: execDate,
      due_date: dueDate,
      priority: prioRaw,
      status: statusRaw,

      // Backend NestJS DTO fields (Spanish)
      titulo: title,
      descripcion: description,
      responsableId: assignee_id ? Number(assignee_id) : undefined,
      categoryId: category_id ? Number(category_id) : undefined,
      groupId: group_id ? Number(group_id) : undefined,
      ganttItemId: gantt_item_id ? Number(gantt_item_id) : undefined,
      fechaInicio: execDate,
      fechaVencimiento: dueDate,
      prioridad: prioridadEnum,
      estado: estadoEnum,
    };
    return client.post('/tasks', payload).then((res) => ({ ...res, data: mapTaskFromBackend(res.data) }));
  },

  update: (id: number, data: any) => {
    const payload: any = { ...data };
    if (data.titulo && !data.title) payload.title = data.titulo;
    if (data.title && !data.titulo) payload.titulo = data.title;
    if (data.descripcion && !data.description) payload.description = data.descripcion;
    if (data.description && !data.descripcion) payload.descripcion = data.description;
    if (data.categoriaId && !data.category_id) payload.category_id = data.categoriaId;
    if (data.category_id && !data.categoriaId) payload.categoriaId = data.category_id;
    if ((data.responsableId || (data.responsableIds && data.responsableIds[0])) && !data.assignee_id) {
      payload.assignee_id = data.responsableId || data.responsableIds[0];
    }
    if (data.assignee_id && !data.responsableId) {
      payload.responsableId = data.assignee_id;
    }
    if (data.status) {
      const clean = String(data.status).toLowerCase();
      payload.status = clean;
      if (clean === 'en_progreso' || clean === 'en_proceso') payload.estado = 'EN_PROCESO';
      else if (clean === 'en_revision' || clean === 'en_revisión') payload.estado = 'EN_REVISION';
      else if (clean === 'bloqueada') payload.estado = 'BLOQUEADA';
      else if (clean === 'completada') {
        payload.estado = 'COMPLETADA';
        triggerTaskCompleted({ id, title: data.title || data.titulo });
      }
      else if (clean === 'eliminada') payload.estado = 'ELIMINADA';
      else payload.estado = 'PENDIENTE';
    }
    if (data.estado && !data.status) {
      payload.estado = data.estado;
      payload.status = String(data.estado).toLowerCase();
      if (payload.status === 'completada') {
        triggerTaskCompleted({ id, title: data.title || data.titulo });
      }
    }
    if (data.priority) payload.priority = String(data.priority).toLowerCase();
    if (data.prioridad && !data.priority) payload.priority = String(data.prioridad).toLowerCase();
    if (data.execution_date) payload.execution_date = String(data.execution_date).split('T')[0];
    if (data.due_date) payload.due_date = String(data.due_date).split('T')[0];
    if (data.fechaVencimiento && !data.due_date) payload.due_date = String(data.fechaVencimiento).split('T')[0];

    return client.patch(`/tasks/${id}`, payload).then((res) => ({ ...res, data: mapTaskFromBackend(res.data) }));
  },

  updateStatus: (id: number, status: string, description?: string) => {
    const cleanStatus = status.toLowerCase();
    let estadoEnum = 'PENDIENTE';
    if (cleanStatus === 'en_progreso' || cleanStatus === 'en_proceso') estadoEnum = 'EN_PROCESO';
    else if (cleanStatus === 'en_revision' || cleanStatus === 'en_revisión') estadoEnum = 'EN_REVISION';
    else if (cleanStatus === 'bloqueada') estadoEnum = 'BLOQUEADA';
    else if (cleanStatus === 'completada') {
      estadoEnum = 'COMPLETADA';
      triggerTaskCompleted({ id });
    }
    else if (cleanStatus === 'eliminada') estadoEnum = 'ELIMINADA';

    const payload: any = {
      status: cleanStatus,
      estado: estadoEnum,
    };
    if (cleanStatus === 'bloqueada' && description) {
      payload.motivoBloqueo = description;
      payload.blockReason = description;
    }
    if (description !== undefined) {
      payload.description = description;
      payload.descripcion = description;
    }

    return client
      .patch(`/tasks/${id}`, payload)
      .then((res) => ({ ...res, data: mapTaskFromBackend(res.data) }));
  },

  remove: (id: number) => client.delete(`/tasks/${id}`),

  restore: (id: number) => client.patch(`/tasks/${id}`, { is_active: true }),

  forceDelete: (id: number) => client.delete(`/tasks/${id}`),

  getTrash: () =>
    client.get('/tasks', { params: { is_active: false } }).then((res) => {
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return { ...res, data: raw.map(mapTaskFromBackend) as Task[] };
    }),

  duplicate: async (id: number) => {
    const original = await client.get(`/tasks/${id}`);
    const task = original.data;
    const cloneData = {
      title: `${task.title || task.titulo || 'Tarea'} (Copia)`,
      description: task.description || task.descripcion || undefined,
      priority: (task.priority || task.prioridad || 'media').toLowerCase(),
      assignee_id: task.assignee_id || task.assignee?.id || task.responsableId || 1,
      category_id: task.category_id || task.category?.id || task.categoriaId || 1,
      execution_date: task.execution_date ? String(task.execution_date).split('T')[0] : new Date().toISOString().split('T')[0],
      due_date: task.due_date ? String(task.due_date).split('T')[0] : undefined,
    };
    return client.post('/tasks', cloneData).then((res) => ({ ...res, data: mapTaskFromBackend(res.data) }));
  },
};

