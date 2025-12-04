import { mount } from '@vue/test-utils';
import { test, expect } from 'vitest';
import PaneSplitter from './PaneSplitter.vue';

test('PaneSplitter renders with horizontal orientation', () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [50, 50],
      splitIndex: 0,
    },
  });

  expect(wrapper.find('.pane-splitter').exists()).toBe(true);
  expect(wrapper.find('.pane-splitter.horizontal').exists()).toBe(true);
});

test('PaneSplitter renders with vertical orientation', () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'vertical',
      sizes: [50, 50],
      splitIndex: 0,
    },
  });

  expect(wrapper.find('.pane-splitter.vertical').exists()).toBe(true);
});

test('PaneSplitter emits resize event on mouse drag', async () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [50, 50],
      splitIndex: 0,
    },
    attachTo: document.body,
  });

  const splitter = wrapper.find('.pane-splitter');

  Object.defineProperty(splitter.element.parentElement, 'offsetWidth', {
    value: 1000,
    configurable: true,
  });

  await splitter.trigger('mousedown', { clientX: 500 });

  expect(wrapper.find('.pane-splitter.active').exists()).toBe(true);

  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 600 }));
  document.dispatchEvent(new MouseEvent('mouseup'));

  const emitted = wrapper.emitted('resize');
  expect(emitted).toBeDefined();
  expect(emitted!.length).toBeGreaterThan(0);
});

test('PaneSplitter respects minimum pane size of 25%', async () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [50, 50],
      splitIndex: 0,
    },
    attachTo: document.body,
  });

  const splitter = wrapper.find('.pane-splitter');

  Object.defineProperty(splitter.element.parentElement, 'offsetWidth', {
    value: 1000,
    configurable: true,
  });

  await splitter.trigger('mousedown', { clientX: 500 });
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
  document.dispatchEvent(new MouseEvent('mouseup'));

  const emitted = wrapper.emitted('resize');
  expect(emitted).toBeDefined();

  const lastResize = emitted![emitted!.length - 1] as [number[]];
  const [leftSize, rightSize] = lastResize[0];

  expect(leftSize).toBeGreaterThanOrEqual(25);
  expect(rightSize).toBeGreaterThanOrEqual(25);
});

test('PaneSplitter removes active class on mouseup', async () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [50, 50],
      splitIndex: 0,
    },
    attachTo: document.body,
  });

  const splitter = wrapper.find('.pane-splitter');

  await splitter.trigger('mousedown', { clientX: 500 });
  expect(wrapper.find('.pane-splitter.active').exists()).toBe(true);

  document.dispatchEvent(new MouseEvent('mouseup'));
  await wrapper.vm.$nextTick();

  expect(wrapper.find('.pane-splitter.active').exists()).toBe(false);
});

test('PaneSplitter handles middle splitter in three-pane layout', async () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [33.33, 33.33, 33.34],
      splitIndex: 1,
    },
    attachTo: document.body,
  });

  const splitter = wrapper.find('.pane-splitter');

  Object.defineProperty(splitter.element.parentElement, 'offsetWidth', {
    value: 900,
    configurable: true,
  });

  await splitter.trigger('mousedown', { clientX: 600 });
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 700 }));
  document.dispatchEvent(new MouseEvent('mouseup'));

  const emitted = wrapper.emitted('resize');
  expect(emitted).toBeDefined();

  const lastResize = emitted![emitted!.length - 1] as [number[]];

  expect(lastResize[0][0]).toBeCloseTo(33.33, 1);
  expect(lastResize[0][1]).toBeGreaterThan(33.33);
  expect(lastResize[0][2]).toBeLessThan(33.34);
});

test('PaneSplitter works with vertical orientation resize', async () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'vertical',
      sizes: [50, 50],
      splitIndex: 0,
    },
    attachTo: document.body,
  });

  const splitter = wrapper.find('.pane-splitter');

  Object.defineProperty(splitter.element.parentElement, 'offsetHeight', {
    value: 800,
    configurable: true,
  });

  await splitter.trigger('mousedown', { clientY: 400 });
  document.dispatchEvent(new MouseEvent('mousemove', { clientY: 300 }));
  document.dispatchEvent(new MouseEvent('mouseup'));

  const emitted = wrapper.emitted('resize');
  expect(emitted).toBeDefined();

  const lastResize = emitted![emitted!.length - 1] as [number[]];

  expect(lastResize[0][0]).toBeLessThan(50);
  expect(lastResize[0][1]).toBeGreaterThan(50);
});

test('PaneSplitter has correct ARIA attributes', () => {
  const wrapper = mount(PaneSplitter, {
    props: {
      orientation: 'horizontal',
      sizes: [60, 40],
      splitIndex: 0,
    },
  });

  const splitter = wrapper.find('.pane-splitter');

  expect(splitter.attributes('role')).toBe('separator');
  expect(splitter.attributes('aria-orientation')).toBe('horizontal');
  expect(splitter.attributes('aria-valuenow')).toBe('60');
  expect(splitter.attributes('aria-valuemin')).toBe('25');
  expect(splitter.attributes('aria-valuemax')).toBe('75');
});
