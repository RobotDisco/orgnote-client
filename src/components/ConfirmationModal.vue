<template>
  <div class="confirmation-modal">
    <h5 v-if="title" class="title capitalize">{{ t(title) }}</h5>

    <card-wrapper v-if="message">
      <menu-item>
        <div class="message capitalize">{{ t(message) }}</div>
      </menu-item>
    </card-wrapper>

    <div class="actions">
      <card-wrapper>
        <menu-item type="danger" @click="resolver(true)">
          {{ t(confirmText ?? I18N.CONFIRM) }}
        </menu-item>
        <menu-item @click="resolver(false)">
          {{ t(cancelText ?? I18N.CANCEL) }}
        </menu-item>
      </card-wrapper>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ConfirmationModalParams } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';
import CardWrapper from './CardWrapper.vue';
import MenuItem from 'src/containers/MenuItem.vue';
defineProps<
  {
    resolver: (data?: boolean) => void;
  } & ConfirmationModalParams
>();

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});
</script>

<style lang="scss" scoped>
.confirmation-modal {
  @include flexify(column, flex-start, flex-start, var(--gap-lg));
}

.actions {
  @include flexify(row, flex-end, center, var(--gap-md));

  @include tablet-below {
    @include flexify(column, flex-end, center, var(--gap-sm));

    button {
      width: 100%;
    }
  }

  & {
    width: 100%;
  }
}
</style>
