<template>
  <transition :name="transitionName" :mode="transitionMode" :css="shouldUseCss">
    <slot />
  </transition>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useConfigStore } from 'src/stores/config';

const props = withDefaults(
  defineProps<{
    animationName?: 'bounce';
    mode?: 'in-out' | 'out-in';
    css?: boolean;
  }>(),
  {
    animationName: 'bounce',
    mode: 'out-in',
    css: true,
  },
);

const { config } = useConfigStore();

const shouldUseCss = computed(() => config.ui.enableAnimations && props.css);
const transitionMode = computed(() =>
  config.ui.enableAnimations ? props.mode : undefined,
);
const transitionName = computed(() =>
  config.ui.enableAnimations ? props.animationName : undefined,
);
</script>

<style scoped>
.bounce-enter-active,
.bounce-leave-active {
  transition:
    transform 0.1s ease,
    opacity 0.1s ease;
}

.bounce-enter-from {
  transform: scale(0.5) rotate(-90deg);
  opacity: 0;
}

.bounce-enter-to {
  transform: scale(1) rotate(0);
  opacity: 1;
}

.bounce-leave-from {
  transform: scale(1) rotate(0);
  opacity: 1;
}

.bounce-leave-to {
  transform: scale(0.5) rotate(90deg);
  opacity: 0;
}
</style>
