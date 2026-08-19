import client from './client';

export const categoriesApi = {
  getAll: () => client.get('/categories'),
  create: (data: any) => client.post('/categories', data),
  remove: (id: number) => client.delete(`/categories/${id}`),
};
