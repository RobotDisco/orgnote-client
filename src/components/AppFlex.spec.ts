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

// Helper to get exposed computed values (they return unwrapped values directly)
const getExposed = (wrapper: ReturnType<typeof createWrapper>) => {
  return wrapper.vm as unknown as {
    computedDirection: string;
    computedJustify: string;
    computedAlign: string;
    cssJustify: string;
    cssAlign: string;
    cssGap: string;
    display: string;
    $el: HTMLElement | null;
  };
};

// Basic rendering tests
test('AppFlex renders slot content', () => {
  const wrapper = createWrapper();
  expect(wrapper.text()).toBe('Content');
});

test('AppFlex renders with flex-container class', () => {
  const wrapper = createWrapper();
  expect(wrapper.find('.flex-container').exists()).toBe(true);
});

// Default values tests
test('AppFlex has correct default direction', () => {
  const wrapper = createWrapper();
  expect(getExposed(wrapper).computedDirection).toBe('row');
});

test('AppFlex has correct default justify', () => {
  const wrapper = createWrapper();
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
});

test('AppFlex has correct default align', () => {
  const wrapper = createWrapper();
  expect(getExposed(wrapper).cssAlign).toBe('center');
});

test('AppFlex has correct default gap', () => {
  const wrapper = createWrapper();
  expect(getExposed(wrapper).cssGap).toBe('0px');
});

test('AppFlex has correct default display', () => {
  const wrapper = createWrapper();
  expect(getExposed(wrapper).display).toBe('flex');
});

// Direction prop tests
test('AppFlex direction prop sets computedDirection to column', () => {
  const wrapper = createWrapper({ direction: 'column' });
  expect(getExposed(wrapper).computedDirection).toBe('column');
});

test('AppFlex direction prop sets computedDirection to row', () => {
  const wrapper = createWrapper({ direction: 'row' });
  expect(getExposed(wrapper).computedDirection).toBe('row');
});

// Justify prop tests
test('AppFlex justify prop start maps to flex-start', () => {
  const wrapper = createWrapper({ justify: 'start' });
  expect(getExposed(wrapper).cssJustify).toBe('flex-start');
});

test('AppFlex justify prop center maps to center', () => {
  const wrapper = createWrapper({ justify: 'center' });
  expect(getExposed(wrapper).cssJustify).toBe('center');
});

test('AppFlex justify prop end maps to flex-end', () => {
  const wrapper = createWrapper({ justify: 'end' });
  expect(getExposed(wrapper).cssJustify).toBe('flex-end');
});

test('AppFlex justify prop between maps to space-between', () => {
  const wrapper = createWrapper({ justify: 'between' });
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
});

test('AppFlex justify prop around maps to space-around', () => {
  const wrapper = createWrapper({ justify: 'around' });
  expect(getExposed(wrapper).cssJustify).toBe('space-around');
});

test('AppFlex justify prop evenly maps to space-evenly', () => {
  const wrapper = createWrapper({ justify: 'evenly' });
  expect(getExposed(wrapper).cssJustify).toBe('space-evenly');
});

// Align prop tests
test('AppFlex align prop start maps to flex-start', () => {
  const wrapper = createWrapper({ align: 'start' });
  expect(getExposed(wrapper).cssAlign).toBe('flex-start');
});

test('AppFlex align prop center maps to center', () => {
  const wrapper = createWrapper({ align: 'center' });
  expect(getExposed(wrapper).cssAlign).toBe('center');
});

test('AppFlex align prop end maps to flex-end', () => {
  const wrapper = createWrapper({ align: 'end' });
  expect(getExposed(wrapper).cssAlign).toBe('flex-end');
});

test('AppFlex align prop stretch maps to stretch', () => {
  const wrapper = createWrapper({ align: 'stretch' });
  expect(getExposed(wrapper).cssAlign).toBe('stretch');
});

test('AppFlex align prop baseline maps to baseline', () => {
  const wrapper = createWrapper({ align: 'baseline' });
  expect(getExposed(wrapper).cssAlign).toBe('baseline');
});

// Gap prop tests
test('AppFlex gap size key md maps to CSS variable', () => {
  const wrapper = createWrapper({ gap: 'md' });
  expect(getExposed(wrapper).cssGap).toBe('var(--gap-md)');
});

test('AppFlex gap size key lg maps to CSS variable', () => {
  const wrapper = createWrapper({ gap: 'lg' });
  expect(getExposed(wrapper).cssGap).toBe('var(--gap-lg)');
});

test('AppFlex gap size key sm maps to CSS variable', () => {
  const wrapper = createWrapper({ gap: 'sm' });
  expect(getExposed(wrapper).cssGap).toBe('var(--gap-sm)');
});

test('AppFlex gap raw value passes through', () => {
  const wrapper = createWrapper({ gap: '20px' });
  expect(getExposed(wrapper).cssGap).toBe('20px');
});

test('AppFlex gap raw value with rem passes through', () => {
  const wrapper = createWrapper({ gap: '1.5rem' });
  expect(getExposed(wrapper).cssGap).toBe('1.5rem');
});

// Inline prop tests
test('AppFlex inline prop sets display to inline-flex', () => {
  const wrapper = createWrapper({ inline: true });
  expect(getExposed(wrapper).display).toBe('inline-flex');
});

test('AppFlex inline false sets display to flex', () => {
  const wrapper = createWrapper({ inline: false });
  expect(getExposed(wrapper).display).toBe('flex');
});

// Direction shortcuts tests
test('AppFlex row shortcut sets direction to row', () => {
  const wrapper = createWrapper({ row: true });
  expect(getExposed(wrapper).computedDirection).toBe('row');
});

test('AppFlex column shortcut sets direction to column', () => {
  const wrapper = createWrapper({ column: true });
  expect(getExposed(wrapper).computedDirection).toBe('column');
});

// Justify shortcuts tests
test('AppFlex start shortcut sets justify to flex-start', () => {
  const wrapper = createWrapper({ start: true });
  expect(getExposed(wrapper).cssJustify).toBe('flex-start');
});

test('AppFlex center shortcut sets justify to center', () => {
  const wrapper = createWrapper({ center: true });
  expect(getExposed(wrapper).cssJustify).toBe('center');
});

test('AppFlex end shortcut sets justify to flex-end', () => {
  const wrapper = createWrapper({ end: true });
  expect(getExposed(wrapper).cssJustify).toBe('flex-end');
});

test('AppFlex between shortcut sets justify to space-between', () => {
  const wrapper = createWrapper({ between: true });
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
});

test('AppFlex around shortcut sets justify to space-around', () => {
  const wrapper = createWrapper({ around: true });
  expect(getExposed(wrapper).cssJustify).toBe('space-around');
});

test('AppFlex evenly shortcut sets justify to space-evenly', () => {
  const wrapper = createWrapper({ evenly: true });
  expect(getExposed(wrapper).cssJustify).toBe('space-evenly');
});

// Align shortcuts tests
test('AppFlex alignStart shortcut sets align to flex-start', () => {
  const wrapper = createWrapper({ alignStart: true });
  expect(getExposed(wrapper).cssAlign).toBe('flex-start');
});

test('AppFlex alignCenter shortcut sets align to center', () => {
  const wrapper = createWrapper({ alignCenter: true });
  expect(getExposed(wrapper).cssAlign).toBe('center');
});

test('AppFlex alignEnd shortcut sets align to flex-end', () => {
  const wrapper = createWrapper({ alignEnd: true });
  expect(getExposed(wrapper).cssAlign).toBe('flex-end');
});

test('AppFlex alignStretch shortcut sets align to stretch', () => {
  const wrapper = createWrapper({ alignStretch: true });
  expect(getExposed(wrapper).cssAlign).toBe('stretch');
});

test('AppFlex alignBaseline shortcut sets align to baseline', () => {
  const wrapper = createWrapper({ alignBaseline: true });
  expect(getExposed(wrapper).cssAlign).toBe('baseline');
});

// Priority tests - shortcuts override explicit props
test('AppFlex column shortcut overrides direction row prop', () => {
  const wrapper = createWrapper({ direction: 'row', column: true });
  expect(getExposed(wrapper).computedDirection).toBe('column');
});

test('AppFlex row shortcut overrides direction column prop', () => {
  const wrapper = createWrapper({ direction: 'column', row: true });
  expect(getExposed(wrapper).computedDirection).toBe('row');
});

test('AppFlex center shortcut overrides justify start prop', () => {
  const wrapper = createWrapper({ justify: 'start', center: true });
  expect(getExposed(wrapper).cssJustify).toBe('center');
});

test('AppFlex between shortcut overrides justify center prop', () => {
  const wrapper = createWrapper({ justify: 'center', between: true });
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
});

test('AppFlex alignEnd shortcut overrides align start prop', () => {
  const wrapper = createWrapper({ align: 'start', alignEnd: true });
  expect(getExposed(wrapper).cssAlign).toBe('flex-end');
});

test('AppFlex alignStretch shortcut overrides align center prop', () => {
  const wrapper = createWrapper({ align: 'center', alignStretch: true });
  expect(getExposed(wrapper).cssAlign).toBe('stretch');
});

// Multiple shortcuts priority (first truthy wins based on check order)
test('AppFlex multiple direction shortcuts - column checked first', () => {
  const wrapper = createWrapper({ row: true, column: true });
  // column is checked before row in the code
  expect(getExposed(wrapper).computedDirection).toBe('column');
});

test('AppFlex multiple justify shortcuts - first truthy wins', () => {
  const wrapper = createWrapper({ center: true, between: true });
  // start is checked first, then center, etc.
  expect(getExposed(wrapper).cssJustify).toBe('center');
});

test('AppFlex multiple align shortcuts - first truthy wins', () => {
  const wrapper = createWrapper({ alignCenter: true, alignEnd: true });
  // alignStart checked first, then alignCenter
  expect(getExposed(wrapper).cssAlign).toBe('center');
});

// Complex combinations
test('AppFlex row + start + alignStretch combination', () => {
  const wrapper = createWrapper({ row: true, start: true, alignStretch: true });
  expect(getExposed(wrapper).computedDirection).toBe('row');
  expect(getExposed(wrapper).cssJustify).toBe('flex-start');
  expect(getExposed(wrapper).cssAlign).toBe('stretch');
});

test('AppFlex column + center + alignCenter combination', () => {
  const wrapper = createWrapper({ column: true, center: true, alignCenter: true });
  expect(getExposed(wrapper).computedDirection).toBe('column');
  expect(getExposed(wrapper).cssJustify).toBe('center');
  expect(getExposed(wrapper).cssAlign).toBe('center');
});

test('AppFlex column + between + alignStart + gap combination', () => {
  const wrapper = createWrapper({ column: true, between: true, alignStart: true, gap: 'md' });
  expect(getExposed(wrapper).computedDirection).toBe('column');
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
  expect(getExposed(wrapper).cssAlign).toBe('flex-start');
  expect(getExposed(wrapper).cssGap).toBe('var(--gap-md)');
});

test('AppFlex row + evenly + alignBaseline + inline combination', () => {
  const wrapper = createWrapper({ row: true, evenly: true, alignBaseline: true, inline: true });
  expect(getExposed(wrapper).computedDirection).toBe('row');
  expect(getExposed(wrapper).cssJustify).toBe('space-evenly');
  expect(getExposed(wrapper).cssAlign).toBe('baseline');
  expect(getExposed(wrapper).display).toBe('inline-flex');
});

// Tag prop tests
test('AppFlex custom tag renders as section', () => {
  const wrapper = createWrapper({ tag: 'section' });
  expect(wrapper.find('section.flex-container').exists()).toBe(true);
});

test('AppFlex custom tag renders as article', () => {
  const wrapper = createWrapper({ tag: 'article' });
  expect(wrapper.find('article.flex-container').exists()).toBe(true);
});

test('AppFlex custom tag with shortcuts', () => {
  const wrapper = createWrapper({ tag: 'nav', column: true, between: true });
  expect(wrapper.find('nav.flex-container').exists()).toBe(true);
  expect(getExposed(wrapper).computedDirection).toBe('column');
  expect(getExposed(wrapper).cssJustify).toBe('space-between');
});

// $el expose test
test('AppFlex exposes $el as HTMLElement', () => {
  const wrapper = createWrapper();
  const exposed = getExposed(wrapper);
  expect(exposed.$el).toBeInstanceOf(HTMLElement);
  expect(exposed.$el?.classList.contains('flex-container')).toBe(true);
});
