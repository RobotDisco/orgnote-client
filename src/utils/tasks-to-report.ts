import type { QueueTask } from 'orgnote-api';

export const tasksToReport = (tasks: QueueTask[]): string => {
  try {
    return JSON.stringify(tasks, null, 2);
  } catch {
    return '[]';
  }
};
