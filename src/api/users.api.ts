import client from './client';
import type { User } from '../types';

export const usersApi = {
  getAll: () =>
    client.get('/users').then((res) => {
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const users: User[] = raw.map((u: any) => ({
        ...u,
        nombre: u.name || u.nombre,
        name: u.name || u.nombre,
        rol: (u.role || u.rol || 'usuario').toUpperCase(),
        role: u.role || u.rol || 'usuario',
        isActive: u.is_active ?? u.isActive ?? true,
      }));
      return { ...res, data: users };
    }),

  create: (data: any) => client.post('/users', data),
  update: (id: number, data: any) => client.patch(`/users/${id}`, data),
  remove: (id: number) => client.delete(`/users/${id}`),
};
