<template>
  <card-wrapper type="plain" style="{ '--spoiler-max-height': maxHeight }">
    <div class="spoiler-header" @click="toggle">
      <div class="spoiler-title">
        <slot name="title" />
      </div>
      <app-icon
        name="sym_o_expand_more"
        size="sm"
        color="fg-alt"
        :class="{ rotated: isExpanded }"
        class="spoiler-icon"
      />
    </div>
    <animation-wrapper animation-name="expand">
      <div v-if="isExpanded" class="spoiler-body">
        <slot name="body" />
      </div>
    </animation-wrapper>
  </card-wrapper>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import CardWrapper from './CardWrapper.vue';
import AppIcon from './AppIcon.vue';
import AnimationWrapper from './AnimationWrapper.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    defaultExpanded?: boolean;
    maxHeight?: string;
  }>(),
  {
    maxHeight: '100px',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isExpanded = ref(props.modelValue ?? props.defaultExpanded ?? false);

const toggle = (): void => {
  isExpanded.value = !isExpanded.value;
  emit('update:modelValue', isExpanded.value);
};

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined) {
      isExpanded.value = newValue;
    }
  },
);

defineExpose({
  isExpanded,
});
</script>

<style scoped lang="scss">
.spoiler-header {
  @include flexify(row, space-between, center, var(--gap-md));

  & {
    cursor: pointer;
    min-height: var(--menu-item-height);
    padding: var(--menu-item-padding);
    transition: background-color 0.2s ease;
  }
}

.spoiler-title {
  @include fontify(var(--font-size-base), var(--font-weight-bold), var(--fg));

  & {
    flex: 1;
  }
}

.spoiler-icon {
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.spoiler-icon.rotated {
  transform: rotate(180deg);
}

.spoiler-body {
  padding: var(--padding-md);
  max-height: var(--spoiler-max-height);
  overflow: auto;
}
</style>
