<template>
  <div class="error-display" :class="{ centered }">
    <div class="error-container">
      <action-button
        :copy-text="errorText"
        icon="sym_o_content_copy"
        fire-icon="sym_o_local_fire_department"
        size="sm"
        class="copy-button"
        border
      />
      <div v-if="Array.isArray(errors)" class="error-content">
        <div v-for="(error, index) in errors" :key="index" class="error-message">
          {{ error }}
        </div>
      </div>
      <div v-else class="error-content">
        <div class="error-message">
          {{ errors }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ActionButton from './ActionButton.vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    errors: string | string[];
    centered?: boolean;
  }>(),
  {
    centered: false,
  },
);

const errorText = computed(() => {
  return Array.isArray(props.errors) ? props.errors.join('\n') : props.errors;
});
</script>

<style lang="scss" scoped>
.error-display {
  @include fit;
  @include flexify(column, center, center);

  & {
    padding: var(--padding-lg);
  }

  &.centered {
    text-align: center;
  }
}

.error-container {
  position: relative;
  max-width: 600px;
  width: 100%;
  border: 1px solid var(--red);
  border-radius: var(--border-radius-md);
  background: color-mix(in srgb, var(--red), transparent 95%);
  padding: var(--padding-lg);

  &:hover .copy-button {
    opacity: 1;
  }
}

.copy-button {
  position: absolute;
  top: var(--padding-sm);
  right: var(--padding-sm);
  opacity: 0;
  transition: opacity 0.2s ease;
  background: var(--bg);
}

.error-content {
  @include flexify(column, flex-start, flex-start, var(--gap-sm));
}

.error-message {
  color: color-mix(in srgb, var(--red), var(--fg) 30%);
  font-family: monospace;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-md);
  font-weight: var(--font-weight-regular);
  margin: 0;
}
</style>
