import { test, expect } from 'vitest';
import { useLogStore } from 'src/stores/log';

test('ErrorPage integration with LogStore works', () => {
  const logStore = useLogStore();
  
  logStore.addLog({
    ts: new Date('2024-01-15T10:30:00.000Z'),
    level: 'error',
    message: 'Test error',
    context: { stack: 'Error stack' },
  });

  const exported = logStore.exportAsText();
  
  expect(exported).toContain('Test error');
  expect(exported).toContain('Error stack');
  expect(logStore.getCountByLevel('error')).toBe(1);
});
