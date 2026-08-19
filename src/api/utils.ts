export const extractArray = <T = any>(data: any): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.tasks)) return data.tasks;
  if (Array.isArray(data.groups)) return data.groups;
  if (Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.result)) return data.result;
  return [];
};
