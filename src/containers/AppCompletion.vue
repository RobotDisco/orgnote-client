<template>
  <container-layout
    class="completion-wrapper"
    :class="{ 'full-screen': config!.fullScreen }"
    :reverse="shouldReverse"
    header-border
    footer-border
  >
    <template #header>
      <div class="header">
        <completion-input :placeholder="placeholder" />
      </div>
    </template>
    <template #body>
      <completion-result v-if="activeCompletion!.candidates?.length" />
      <div v-else class="not-found" :style="{ height: completionItemHeight + 'px' }">
        {{ t(I18N.NOT_FOUND).toUpperCase() }}
      </div>
    </template>
    <template #footer>
      <div class="footer">
        {{ (activeCompletion!.selectedCandidateIndex ?? 0) + 1 }}/{{ activeCompletion!.total }}
      </div>
    </template>
  </container-layout>
</template>

<script lang="ts" setup>
import { I18N, type CompletionConfig } from 'orgnote-api';
import CompletionInput from './CompletionInput.vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import CompletionResult from './CompletionResult.vue';
import { computed } from 'vue';
import { DEFAULT_COMPLETIO_ITEM_HEIGHT } from 'src/constants/completion-item';
import { useI18n } from 'vue-i18n';
import ContainerLayout from 'src/components/ContainerLayout.vue';
defineProps<
  {
    placeholder?: string;
  } & Partial<CompletionConfig>
>();

const { config } = storeToRefs(api.ui.useModal());
const completionStore = api.core.useCompletion();
const { activeCompletion } = storeToRefs(completionStore);

const completionItemHeight = computed(
  () => activeCompletion.value!.itemHeight ?? DEFAULT_COMPLETIO_ITEM_HEIGHT,
);

const { desktopBelow } = api.ui.useScreenDetection();
const shouldReverse = computed(() => desktopBelow.value);

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.completion-wrapper {
  max-width: var(--completion-max-width);
  width: var(--completion-width) !important;

  &.full-screen {
    max-width: unset;
  }

  .layout-body {
    padding: var(--completion-padding);
    padding-right: calc(var(--completion-padding) - var(--scroll-bar-width));
  }
}

.header {
  padding: var(--completion-padding);
}

.footer {
  @include flexify(row, center, center);

  & {
    padding: var(--padding-lg);
    height: var(--completion-footer-height);
    color: var(--fg-alt);
  }
}

@mixin completion-fullframe {
  max-width: unset;
  width: 100% !important;
  height: 100%;
}

@include desktop-below {
  .completion-wrapper {
    @include completion-fullframe();
  }
}

@include tablet-above {
  .completion-wrapper {
    &:not(.full-screen) {
      max-height: var(--completion-max-height, 68vh);
    }
  }
}

.full-screen {
  @include completion-fullframe();
}

.not-found {
  @include flexify(row, center, center);

  & {
    color: var(--fg-alt);
  }
}
</style>
