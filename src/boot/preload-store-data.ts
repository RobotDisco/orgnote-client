import { defineBoot } from '@quasar/app-vite/wrappers';
import { repositories } from './repositories';
import { MAX_LOGS, useLogStore } from 'src/stores/log';
import { connectLogRepository, initializeLogStore } from 'src/stores/log-dispatcher';

export default defineBoot(async ({ store }) => {
  const logRepository = repositories?.logRepository;
  if (!logRepository || !process.env.CLIENT) return;

  const logStore = useLogStore(store);

  try {
    const records = await logRepository.query({ limit: MAX_LOGS });
    initializeLogStore(logStore, records);
  } catch (error) {
    console.error('Failed to initialize log store:', error);
    initializeLogStore(logStore, []);
  }

  connectLogRepository(logRepository);
});
