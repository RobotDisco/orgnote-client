<template>
  <app-flex
    class="subscription-settings"
    direction="column"
    justify="start"
    align="center"
    gap="lg"
  >
    <template v-if="!user?.active">
      <card-wrapper>
        <menu-item @click="inputRef?.focus()">
          <app-input
            v-model="activationKey"
            ref="inputRef"
            :placeholder="t(I18N.SUBSCRIPTION_KEY)"
          />
        </menu-item>
        <menu-item @click="activate" :disabled="!activationKey" type="info">
          <div class="capitalize text-bold">{{ t(I18N.ACTIVATE) }}</div>
        </menu-item>
      </card-wrapper>

      <app-card type="info">
        <template #cardTitle>
          <div class="capitalize">
            {{ t(I18N.WANT_SUBSCRIPTION) }}
          </div>
        </template>
        <app-description>
          <p class="capitalize">{{ t(I18N.SEVERAL_OPTIONS) }}</p>
          <ul>
            <li>
              <app-link href="https://about.org-note.com" class="capitalize">{{
                t(I18N.SIGNUP_FOR_BETA)
              }}</app-link>
              {{ t(I18N.ACTIVE_TESTERS_KEY) }}
            </li>
            <li class="capitalize">
              {{ t(I18N.OPEN_SOURCE_DEVELOPER_WRITE) }}
            </li>
            <li class="capitalize">
              {{ t(I18N.TRY_OWN_SERVER) }}
            </li>
            <li class="capitalize">
              <app-link :href="PATREON_LINK">{{ t(I18N.SUBSCRIBE_PATREON) }}</app-link>
            </li>
          </ul>
        </app-description>
      </app-card>
    </template>

    <app-satisfied v-else :text="t(I18N.SUCCESSFULLY_SUBSCRIBED)" />
  </app-flex>
</template>

<script lang="ts" setup>
import AppInput from 'src/components/AppInput.vue';
import MenuItem from './MenuItem.vue';
import { useI18n } from 'vue-i18n';
import { I18N } from 'orgnote-api';
import CardWrapper from 'src/components/CardWrapper.vue';
import { ref } from 'vue';
import { PATREON_LINK } from 'src/constants/external-link';
import AppCard from 'src/components/AppCard.vue';
import AppFlex from 'src/components/AppFlex.vue';
import AppLink from 'src/components/AppLink.vue';
import AppSatisfied from 'src/components/AppSatisfied.vue';
import { api } from 'src/boot/api';
import { storeToRefs } from 'pinia';

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true,
});

const inputRef = ref<typeof AppInput | undefined>();

const authStore = api.core.useAuth();
const { user } = storeToRefs(authStore);

const activationKey = ref<string>('');

const activate = () => authStore.subscribe(activationKey.value);
</script>

<style lang="scss" scoped>
.subscription-settings {
  & {
    width: 100%;
  }
}
.reference {
  padding-top: var(--padding-lg);
}
</style>
