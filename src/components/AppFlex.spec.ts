import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import AppFlex from './AppFlex.vue';

const createWrapper = (
  props: Record<string, unknown> = {},
  slots = { default: '<div>Content</div>' },
) =>
  mount(AppFlex, {
    props,
    slots,
  });

test('AppFlex renders slot content', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).toBe('Content');
});

test('AppFlex applies default styles', () => {
  const wrapper = createWrapper();
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('flex-direction: row');
  expect(style).toContain('justify-content: space-between');
  expect(style).toContain('align-items: center');
  expect(style).toContain('gap: 0px');
});

test('AppFlex applies direction prop', () => {
  const wrapper = createWrapper({ direction: 'column' });
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('flex-direction: column');
});

test('AppFlex maps justify prop correctly', () => {
  const wrapper = createWrapper({ justify: 'start' });
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('justify-content: flex-start');
});

test('AppFlex maps align prop correctly', () => {
  const wrapper = createWrapper({ align: 'end' });
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('align-items: flex-end');
});

test('AppFlex applies gap size key', () => {
  const wrapper = createWrapper({ gap: 'md' });
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('gap: var(--gap-md)');
});

test('AppFlex applies raw gap value', () => {
  const wrapper = createWrapper({ gap: '20px' });
  const style = wrapper.find('.flex-container').attributes('style');
  expect(style).toContain('gap: 20px');
});
