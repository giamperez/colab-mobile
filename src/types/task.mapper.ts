import type { Task, PriorityLevel, TaskStatus } from './index';

import dayjs from 'dayjs';

export const mapTaskFromBackend = (rawTask: any): Task => {
  if (!rawTask) return rawTask;

  const title = rawTask.titulo || rawTask.title || 'Sin título';
  const description = rawTask.descripcion || rawTask.description;

  // Status mapping
  let status: TaskStatus = 'pendiente';
  const rawStatus = (rawTask.estado || rawTask.status || '').toUpperCase();
  if (rawStatus === 'EN_PROCESO' || rawStatus === 'EN_PROGRESO') {
    status = 'en_progreso';
  } else if (rawStatus === 'EN_REVISION' || rawStatus === 'EN_REVISIÓN') {
    status = 'en_revision';
  } else if (rawStatus === 'BLOQUEADA') {
    status = 'bloqueada';
  } else if (rawStatus === 'COMPLETADA') {
    status = 'completada';
  } else if (rawStatus === 'ELIMINADA') {
    status = 'eliminada';
  } else if (rawStatus === 'PENDIENTE') {
    status = 'pendiente';
  } else if (['pendiente', 'en_progreso', 'en_revision', 'bloqueada', 'completada', 'eliminada'].includes(rawTask.status)) {
    status = rawTask.status as TaskStatus;
  }

  // Priority mapping
  let priority: PriorityLevel = 'media';
  const rawPriority = (rawTask.prioridad || rawTask.priority || '').toLowerCase();
  if (['muy_alta', 'alta', 'media', 'baja', 'muy_baja'].includes(rawPriority)) {
    priority = rawPriority as PriorityLevel;
  } else if (rawPriority === 'normal') {
    priority = 'media';
  }

  // Backend date fields are calendar dates stored as UTC midnight timestamps
  // ("2026-09-01T00:00:00.000Z"). Parsing them with dayjs() and reformatting
  // converts to the device's local timezone first, which rolls the date back
  // a day in negative UTC offsets (e.g. Peru, UTC-5). Take the calendar date
  // part directly instead — never convert through local time.
  const toLocalDateString = (val: any): string | null => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.split('T')[0];
    const parsed = dayjs(s);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : s;
  };

  const rawExec = rawTask.execution_date || rawTask.fechaInicio || rawTask.fechaVencimiento;
  const execution_date = toLocalDateString(rawExec) || dayjs().format('YYYY-MM-DD');

  const rawDue = rawTask.due_date || rawTask.fechaVencimiento;
  const due_date = toLocalDateString(rawDue);

  let progress = typeof rawTask.progress === 'number' ? rawTask.progress : 0;
  if (rawTask.progress === undefined && typeof rawTask.progreso === 'number') {
    progress = rawTask.progreso;
  } else if (rawTask.progress === undefined) {
    if (status === 'completada') progress = 100;
    else if (status === 'en_progreso' || status === 'bloqueada') progress = 50;
    else progress = 0;
  }

  const assignee = rawTask.assignee || rawTask.responsable;
  const assignee_id = rawTask.assignee_id || rawTask.responsableId || assignee?.id || null;
  const category = rawTask.category || rawTask.categoria;

  const mappedAssignee = assignee
    ? {
        id: assignee.id,
        name: assignee.name || assignee.nombre || 'Sin nombre',
        nombre: assignee.name || assignee.nombre || 'Sin nombre',
        emoji: assignee.emoji,
        avatarUrl: assignee.avatarUrl,
      }
    : undefined;

  const mappedAssignees = rawTask.assignees?.map((a: any) => ({
    user: {
      id: a.user?.id || a.id,
      nombre: a.user?.name || a.user?.nombre || a.name || a.nombre || 'Sin nombre',
      name: a.user?.name || a.user?.nombre || a.name || a.nombre || 'Sin nombre',
      emoji: a.user?.emoji || a.emoji,
      avatarUrl: a.user?.avatarUrl || a.avatarUrl,
    },
  })) || (mappedAssignee ? [{ user: mappedAssignee }] : undefined);

  return {
    ...rawTask,
    id: rawTask.id,
    title,
    description,
    status,
    priority,
    progress,
    execution_date,
    due_date,
    completed_at: rawTask.completed_at || undefined,
    fechaInicio: rawTask.fechaInicio || undefined,
    fechaVencimiento: rawTask.fechaVencimiento || undefined,
    blockReason: rawTask.blockReason || rawTask.motivoBloqueo || undefined,
    assignee_id,
    assignee: mappedAssignee,
    assignees: mappedAssignees,
    category: category
      ? {
          id: category.id,
          name: category.name || category.nombre || 'Categoría',
          color: category.color || '#64748B',
        }
      : undefined,
    group: rawTask.group || undefined,
    groupNombre: rawTask.group?.name || rawTask.group?.nombre || rawTask.groupNombre || undefined,
    group_id: rawTask.group_id ?? rawTask.groupId ?? rawTask.group?.id ?? null,
    groupId: rawTask.group_id ?? rawTask.groupId ?? rawTask.group?.id ?? null,
    gantt_item_id: rawTask.gantt_item_id || rawTask.ganttItemId || null,
    is_checked: !!rawTask.is_checked,
    gantt_item: rawTask.gantt_item || rawTask.ganttItem,
  };
};
