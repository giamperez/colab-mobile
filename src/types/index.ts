export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'JEFE'
  | 'COLABORADOR'
  | 'USUARIO'
  | 'INVITADO'
  | 'superadmin'
  | 'admin'
  | 'jefe'
  | 'usuario'
  | 'colaborador';

export interface User {
  id: number;
  nombre: string;
  name?: string;
  dni?: string;
  email: string;
  avatarUrl?: string;
  whatsapp?: string;
  isActive: boolean;
  is_active?: boolean;
  rol: UserRole;
  role?: UserRole;
  companyId: number | null;
  companyName?: string;
  companyPlan?: string;
  companyPlanVencimiento?: string | null;
  companies?: { id: number; nombre: string; rol: string }[];
  emoji?: string;
  group_id?: number | null;
  group_name?: string | null;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  esJefe: boolean;
  user?: Pick<User, 'id' | 'nombre' | 'email' | 'avatarUrl' | 'emoji'>;
}

export interface Group {
  id: number;
  name: string;
  nombre?: string;
  color: string;
  description?: string;
  descripcion?: string;
  telegram_chat_id?: string;
  is_active?: boolean;
  createdAt?: string;
  companyId?: number;
  _count?: { miembros: number };
}

export interface Category {
  id: number;
  name: string;
  nombre?: string;
  color: string;
  is_global?: boolean;
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

export type TaskStatus = 'pendiente' | 'en_progreso' | 'en_revision' | 'bloqueada' | 'completada' | 'eliminada';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  en_revision: 'En Revisión',
  bloqueada: 'Bloqueada',
  completada: 'Completada',
  eliminada: 'Eliminada',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente: '#94A3B8',
  en_progreso: '#7C83FF',
  en_revision: '#FF9E6D',
  bloqueada: '#FF7BA9',
  completada: '#10B981',
  eliminada: '#EF4444',
};

export interface TaskAssignee {
  user?: {
    id: number;
    nombre: string;
    name?: string;
    emoji?: string;
    avatarUrl?: string;
  };
}

export interface Task {
  id: number;
  title: string;
  titulo?: string;
  description?: string;
  descripcion?: string;
  priority: PriorityLevel;
  prioridad?: string;
  status: TaskStatus;
  estado?: string;
  progress?: number;
  execution_date: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  due_date?: string | null;
  completed_at?: string;
  blockReason?: string;
  assignee_id?: number;
  assignee?: {
    id: number;
    name: string;
    nombre?: string;
    emoji?: string;
    avatarUrl?: string;
  };
  assignees?: TaskAssignee[];
  category?: {
    id: number;
    name: string;
    color: string;
  };
  group_id?: number;
  groupId?: number;
  group?: {
    id: number;
    name?: string;
    nombre?: string;
    color?: string;
  };
  groupNombre?: string;
  gantt_item_id?: number | null;
  project_id?: number | null;
  projectId?: number | null;
  is_checked?: boolean;
  gantt_item?: {
    id: number;
    title: string;
    color: string;
  };
  project?: {
    id: number;
    name?: string;
    nombre?: string;
  };
}

export interface Project {
  id: number;
  name?: string;
  nombre?: string;
  color?: string;
}

export interface GanttSubtask {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  is_checked?: boolean;
  assignee?: {
    id: number;
    name: string;
    nombre?: string;
    emoji?: string;
  };
}

export interface GanttItem {
  id: number;
  title: string;
  nombre?: string;
  description?: string;
  descripcion?: string;
  color: string;
  type: string;
  tipo?: string;
  status: string;
  estado?: string;
  progress: number;
  progreso?: number;
  start_date: string;
  fechaInicio?: string;
  end_date: string;
  fechaFin?: string;
  group_id?: number;
  groupId?: number;
  group?: Group;
  tasks?: GanttSubtask[];
  subtasks?: GanttSubtask[];
}

export interface GanttType {
  id: number;
  nombre: string;
  color?: string;
  icono?: string;
}

export interface Report {
  id: number;
  type: 'daily' | 'weekly' | 'monthly';
  tipo?: 'daily' | 'weekly' | 'monthly';
  channel?: string;
  content: string;
  contenido?: string;
  created_at: string;
  createdAt?: string;
  group?: Group;
}

export interface AgendaLog {
  id: number;
  raw_text: string;
  source: string;
  tasks_created: number;
  created_at: string;
}
