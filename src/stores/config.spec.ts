import { test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('should initialize with default config', () => {
  const store = useConfigStore();

  expect(store.config).toEqual(clone()(DEFAULT_CONFIG));
  expect(store.configErrors).toEqual([]);
  expect(store.sync).toBeDefined();
});

test('should have config as reactive object', () => {
  const store = useConfigStore();

  expect(store.config).toBeDefined();
  expect(store.config.system).toBeDefined();
  expect(store.config.ui).toBeDefined();
});

test('should have empty config errors initially', () => {
  const store = useConfigStore();

  expect(store.configErrors).toEqual([]);
  expect(Array.isArray(store.configErrors)).toBe(true);
});

test('should have sync method', () => {
  const store = useConfigStore();

  expect(typeof store.sync).toBe('function');
});

test('config should be equal to DEFAULT_CONFIG structure', () => {
  const store = useConfigStore();
  const defaultConfig = clone()(DEFAULT_CONFIG);

  expect(store.config.system).toEqual(defaultConfig.system);
  expect(store.config.ui).toEqual(defaultConfig.ui);
});

test('should create independent store instances', () => {
  const store1 = useConfigStore();
  const store2 = useConfigStore();

  expect(store1).toBe(store2);
});

test('config should be mutable', () => {
  const store = useConfigStore();

  store.config.system.language = 'ru-RU';

  expect(store.config.system.language).toBe('ru-RU');
});

test('configErrors should be reactive array', () => {
  const store = useConfigStore();

  store.configErrors.push('Test error');

  expect(store.configErrors).toContain('Test error');
  expect(store.configErrors.length).toBe(1);
});
