export interface User {
  id: number;
  name: string;
  dni: string;
  email?: string;
  role: 'admin' | 'jefe' | 'usuario';
  group_id: number | null;
  group_name?: string | null;
  emoji?: string;
  whatsapp?: string;
  is_active: boolean;
}

export interface Group {
  id: number;
  name: string;
  color: string;
  description?: string;
  telegram_chat_id?: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  is_global: boolean;
  group_id?: number;
}

export type PriorityLevel = 'muy_baja' | 'baja' | 'media' | 'alta' | 'muy_alta';

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  muy_baja: 'Muy baja',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  muy_alta: 'Muy alta',
};

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  muy_baja: '#6B7280',
  baja: '#0EA5E9',
  media: '#F59E0B',
  alta: '#F97316',
  muy_alta: '#DC2626',
};

export const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  muy_baja: 1,
  baja: 2,
  media: 3,
  alta: 4,
  muy_alta: 5,
};

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada';
  progress: number;
  execution_date: string;
  due_date?: string | null;
  completed_at?: string;
  assignee: {
    id: number;
    name: string;
    emoji?: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
  };
  group_id: number;
  gantt_item_id?: number | null;
  is_checked: boolean;
  gantt_item?: {
    id: number;
    title: string;
    color: string;
  };
}

export interface GanttSubtask {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'alta' | 'media' | 'normal';
  status: 'pendiente' | 'en_progreso' | 'bloqueada' | 'completada';
  assignee?: {
    id: number;
    name: string;
  };
}

export interface GanttItem {
  id: number;
  title: string;
  description?: string;
  color: string;
  type: string;
  status: string;
  progress: number;
  start_date: string;
  end_date: string;
  group_id: number;
  tasks?: GanttSubtask[];
  subtasks?: GanttSubtask[];
}

export interface Report {
  id: number;
  type: 'daily' | 'weekly' | 'monthly';
  channel: string;
  content: string;
  created_at: string;
  group?: Group;
}

export interface AgendaLog {
  id: number;
  raw_text: string;
  source: string;
  tasks_created: number;
  created_at: string;
}
