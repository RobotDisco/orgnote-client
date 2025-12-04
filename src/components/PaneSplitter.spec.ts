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
