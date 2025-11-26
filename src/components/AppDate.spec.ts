import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppDate from './AppDate.vue';

const createWrapper = (props: Record<string, unknown> = {}) =>
  mount(AppDate, {
    props: {
      date: new Date('2023-01-01T12:00:00.000Z'),
      ...props,
    },
  });

test('AppDate renders formatted date by default', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).not.toBe('Invalid Date');
  expect(wrapper.text().length).toBeGreaterThan(0);
});

test('AppDate renders time format', () => {
  const wrapper = createWrapper({ format: 'time' });
  expect(wrapper.text()).toMatch(/\d{1,2}:\d{2}/);
});

test('AppDate renders date format', () => {
  const wrapper = createWrapper({ format: 'date' });
  expect(wrapper.text()).toMatch(/\d{1,4}/);
});

test('AppDate renders iso format', () => {
  const wrapper = createWrapper({ format: 'iso' });
  expect(wrapper.text()).toBe('2023-01-01T12:00:00.000Z');
});

test('AppDate applies monospace class', () => {
  const wrapper = createWrapper({ monospace: true });
  expect(wrapper.find('.app-date').classes()).toContain('monospace');
});

test('AppDate handles invalid date', () => {
  const wrapper = createWrapper({ date: 'invalid-date' });
  expect(wrapper.text()).toBe('Invalid Date');
});

test('AppDate handles timestamp input', () => {
  const timestamp = 1672574400000;
  const wrapper = createWrapper({ date: timestamp, format: 'iso' });
  expect(wrapper.text()).toBe('2023-01-01T12:00:00.000Z');
});
