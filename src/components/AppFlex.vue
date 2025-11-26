<template>
  <div class="flex-container">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { type StyleSize, STYLE_SIZES } from 'orgnote-api';

const props = withDefaults(
  defineProps<{
    direction?: 'row' | 'column';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    gap?: StyleSize | ({} & string);
  }>(),
  {
    direction: 'row',
    justify: 'between',
    align: 'center',
    gap: '0px',
  },
);

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
  center: 'center',
};

const alignMap: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  baseline: 'baseline',
};

const cssJustify = computed(() => {
  return justifyMap[props.justify] ?? props.justify;
});

const cssAlign = computed(() => {
  return alignMap[props.align] ?? props.align;
});

const cssGap = computed(() => {
  if (STYLE_SIZES.includes(props.gap as StyleSize)) {
    return `var(--gap-${props.gap})`;
  }
  return props.gap;
});
</script>

<style lang="scss" scoped>
.flex-container {
  @include flexify(v-bind(direction), v-bind(cssJustify), v-bind(cssAlign), v-bind(cssGap));
}
</style>
