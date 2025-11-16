import { mount } from '@vue/test-utils';
import AppSpoiler from './AppSpoiler.vue';
import { test, expect, vi } from 'vitest';
import { nextTick } from 'vue';

vi.mock('src/stores/config', () => ({
  useConfigStore: vi.fn(() => ({
    config: {
      ui: { animations: false },
    },
  })),
}));

test('AppSpoiler should render collapsed by default', () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-title').text()).toBe('Test Title');
  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler should start expanded when defaultExpanded is true', () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      defaultExpanded: true,
    },
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler should toggle expanded state on header click', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler should emit update:modelValue on toggle', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  await wrapper.find('.spoiler-header').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);

  await wrapper.find('.spoiler-header').trigger('click');

  expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);
});

test('AppSpoiler should respect modelValue false', () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      modelValue: false,
    },
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(false);
});

test('AppSpoiler should respect modelValue true', () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      modelValue: true,
    },
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler should rotate icon when expanded', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  let icon = wrapper.find('.spoiler-icon');
  expect(icon.classes()).not.toContain('rotated');

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();

  icon = wrapper.find('.spoiler-icon');
  expect(icon.classes()).toContain('rotated');
});

test('AppSpoiler should handle multiple rapid clicks', async () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  await wrapper.find('.spoiler-header').trigger('click');
  await wrapper.find('.spoiler-header').trigger('click');
  await wrapper.find('.spoiler-header').trigger('click');

  expect(wrapper.emitted('update:modelValue')).toHaveLength(3);
  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler should use defaultExpanded when modelValue is undefined', () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      defaultExpanded: true,
    },
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler should render without body slot', async () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      defaultExpanded: false,
    },
    slots: {
      title: 'Test Title',
    },
  });

  await nextTick();
  expect(wrapper.find('.spoiler-title').exists()).toBe(true);
  expect(wrapper.find('.spoiler-body').exists()).toBe(false);

  await wrapper.find('.spoiler-header').trigger('click');
  await nextTick();

  expect(wrapper.find('.spoiler-body').exists()).toBe(true);
});

test('AppSpoiler should render without title slot', () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      body: 'Test Body',
    },
  });

  expect(wrapper.find('.spoiler-header').exists()).toBe(true);
  expect(wrapper.find('.spoiler-title').text()).toBe('');
});

test('AppSpoiler should render expand icon with correct props', () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  const icon = wrapper.findComponent({ name: 'AppIcon' });
  expect(icon.exists()).toBe(true);
  expect(icon.props('name')).toBe('sym_o_expand_more');
  expect(icon.props('size')).toBe('sm');
  expect(icon.props('color')).toBe('fg-alt');
});

test('AppSpoiler should wrap content in AnimationWrapper with expand animation', () => {
  const wrapper = mount(AppSpoiler, {
    props: {
      defaultExpanded: true,
    },
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  const animationWrapper = wrapper.findComponent({ name: 'AnimationWrapper' });
  expect(animationWrapper.exists()).toBe(true);
  expect(animationWrapper.props('animationName')).toBe('expand');
});

test('AppSpoiler should use CardWrapper with plain type', () => {
  const wrapper = mount(AppSpoiler, {
    slots: {
      title: 'Test Title',
      body: 'Test Body',
    },
  });

  const cardWrapper = wrapper.findComponent({ name: 'CardWrapper' });
  expect(cardWrapper.exists()).toBe(true);
  expect(cardWrapper.props('type')).toBe('plain');
});




