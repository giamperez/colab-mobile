import client from './client';

export const reportsApi = {
  getAll: () => client.get('/reports'),
  generateDaily: (data: any) => client.post('/reports/daily', data),
  generateWeekly: (data: any) => client.post('/reports/weekly', data),
  generateMonthly: (data: any) => client.post('/reports/monthly', data),
  generate: (data: { type: string; channel?: string; group_id?: number }) => {
    if (data.type === 'daily') return client.post('/reports/daily', data);
    if (data.type === 'monthly') return client.post('/reports/monthly', data);
    return client.post('/reports/weekly', data);
  },
  sendTelegram: (data: any) => client.post('/reports/save', data),
  save: (data: any) => client.post('/reports/save', data),
  getWeeklyTrend: () => client.get('/reports/weekly-trend'),
};
