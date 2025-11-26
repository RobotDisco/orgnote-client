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

test('AppFlex renders with flex-container class', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.flex-container').exists()).toBe(true);
});

test('AppFlex accepts direction prop', () => {
  const wrapper = createWrapper({ direction: 'column' });
  expect(wrapper.props('direction')).toBe('column');
});

test('AppFlex accepts justify prop', () => {
  const wrapper = createWrapper({ justify: 'start' });
  expect(wrapper.props('justify')).toBe('start');
});

test('AppFlex accepts align prop', () => {
  const wrapper = createWrapper({ align: 'end' });
  expect(wrapper.props('align')).toBe('end');
});

test('AppFlex accepts gap size key', () => {
  const wrapper = createWrapper({ gap: 'md' });
  expect(wrapper.props('gap')).toBe('md');
});

test('AppFlex accepts raw gap value', () => {
  const wrapper = createWrapper({ gap: '20px' });
  expect(wrapper.props('gap')).toBe('20px');
});

test('AppFlex has default props', () => {
  const wrapper = createWrapper();
  expect(wrapper.props('direction')).toBe('row');
  expect(wrapper.props('justify')).toBe('between');
  expect(wrapper.props('align')).toBe('center');
  expect(wrapper.props('gap')).toBe('0px');
});
