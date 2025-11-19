<template>
  <div class="icon" :style="iconStyle" :class="[{ rounded, bordered }, size, $attrs.class]">
    <q-icon v-bind="$props" color="inherit" :size="iconSize" />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  inheritAttrs: false,
});
import type { StyleSize, ThemeVariable } from 'orgnote-api';
import type { QIconProps } from 'quasar';
import { getCssVariableName } from 'src/utils/css-utils';
import { computed } from 'vue';

interface Props {
  color?: ThemeVariable;
  background?: string;
  size?: StyleSize;
  rounded?: boolean;
  bordered?: boolean;
}

const props = withDefaults(defineProps<QIconProps & Props>(), {
  size: 'md',
});

const bgColor = computed(() => props.background && getCssVariableName(props.background));
const color = computed(() => (props.color ? getCssVariableName(props.color) : undefined));
const size = computed(() => `icon-${props.size}`);

const iconStyle = computed(() => {
  const style: Record<string, string> = {};
  if (bgColor.value) style.backgroundColor = bgColor.value;
  if (color.value) style.color = color.value;
  return Object.keys(style).length > 0 ? style : undefined;
});

const iconSizeMap: { [key in StyleSize]?: string } = {
  xs: '1em',
  sm: '1.2em',
  md: '1.6em',
  lg: '3em',
};
const iconSize = computed(() => iconSizeMap[props.size]);
</script>

<style lang="scss">
.icon {
  @include flexify(flex-start, center, center);

  $btn-sizes: (
    xs: var(--btn-action-xs-size),
    sm: var(--btn-action-sm-size),
    md: var(--btn-action-md-size),
    lg: var(--btn-action-lg-size),
  );

  @each $size, $value in $btn-sizes {
    &.icon-#{$size} {
      width: $value;
      height: $value;
      min-width: $value;
      min-height: $value;
    }
  }
}

.icon.rounded {
  border-radius: var(--icon-rounded-border-radius);
  padding: 2px;
  box-sizing: content-box;
}

.bordered {
  border: var(--icon-border);
  padding: var(--icon-border-padding);
  border-radius: var(--icon-border-radius);
}
</style>
