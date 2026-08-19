import client from './client';

export const agendaApi = {
  process: (data: any) => client.post('/agenda/process', data),
};
