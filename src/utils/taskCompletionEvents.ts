type TaskCompletionListener = (taskInfo?: { id?: number; title?: string }) => void;

const listeners: Set<TaskCompletionListener> = new Set();

export const onTaskCompleted = (listener: TaskCompletionListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const triggerTaskCompleted = (taskInfo?: { id?: number; title?: string } | string) => {
  const info = typeof taskInfo === 'string' ? { title: taskInfo } : taskInfo;
  listeners.forEach((l) => {
    try {
      l(info);
    } catch (e) {
      console.log('Error in task completion listener', e);
    }
  });
};
