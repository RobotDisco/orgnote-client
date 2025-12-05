<template>
  <card-wrapper :type="type">
    <app-flex column start align-start gap="md" class="card-inner">
      <app-flex
        v-if="slots.cardTitle || shouldShowIcon"
        class="card-header"
        row
        start
        align-center
        gap="sm"
      >
        <app-icon v-if="shouldShowIcon" size="sm" :name="computedIcon" :color="background" />
        <h5 v-if="slots.cardTitle" class="card-title text-bold" :style="{ color: bg }">
          <slot name="cardTitle" />
        </h5>
      </app-flex>
      <div class="card-content" :style="{ color: bg }">
        <slot />
      </div>
    </app-flex>
  </card-wrapper>
</template>

<script lang="ts" setup>
import CardWrapper from 'src/components/CardWrapper.vue';
import { getCssVariableName } from 'src/utils/css-utils';
import { useSlots } from 'vue';
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import { CARD_TYPE_TO_BACKGROUND } from 'src/constants/card-type-to-background';
import type { StyleVariant } from 'orgnote-api';
import AppFlex from 'src/components/AppFlex.vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    bordered?: boolean;
    outline?: boolean;
    type?: StyleVariant;
    icon?: string;
  }>(),
  {
    type: 'plain',
  },
);

const slots = useSlots();

const background = computed(() => {
  return CARD_TYPE_TO_BACKGROUND[props.type];
});

const typeIconMap: { [key in StyleVariant]?: string } = {
  plain: 'sym_o_info',
  info: 'sym_o_info',
  warning: 'sym_o_warning',
  danger: 'sym_o_dangerous',
};

const computedIcon = computed(() => {
  return props.icon || typeIconMap[props.type];
});

const shouldShowIcon = computed(() => {
  return props.icon || props.type !== 'plain';
});

const bg = computed(() => background.value && getCssVariableName(background.value));
</script>

<style lang="scss" scoped>
.card-wrapper {
  & {
    box-sizing: border-box;
    padding: var(--padding-lg);
    overflow: auto;
  }
}

.card-inner {
  width: 100%;
}

h5 {
  margin: 0;
}

@include for-each-view-type using ($type, $color) {
  .#{$type} {
    ::v-deep(input::placeholder) {
      color: color-mix(in srgb, $color, var(--bg) 35%) !important;
    }
  }
}

.card-content {
  width: 100%;
}
</style>
