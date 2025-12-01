<template>
  <container-layout gap="md">
    <template #header>
      <app-grid :cols="1" gap="md">
        <app-flex end align-center gap="sm">
          <action-button
            @click="refresh"
            color="fg"
            size="sm"
            outline
            border
            icon="sym_o_refresh"
            :tooltip="$t(i18n.REFRESH)"
          />
          <action-button
            @click="openInstallDialog"
            color="green"
            size="sm"
            outline
            border
            icon="sym_o_add"
            :tooltip="$t(i18n.INSTALL_EXTENSION)"
          />
        </app-flex>

        <app-dropdown
          v-model="selectedTab"
          :options="tabOptions"
          option-label="label"
          :clearable="false"
          :use-input="false"
          class="tab-dropdown"
        />
      </app-grid>
    </template>

    <template #body>
      <card-wrapper class="extensions-list">
        <empty-state v-if="displayedExtensions.length === 0" :title="$t(emptyMessageKey)" />
        <ExtensionItem
          v-else
          v-for="ext in displayedExtensions"
          :key="ext.manifest.name"
          :extension="ext"
          @enable="enableExtension"
          @disable="disableExtension"
          @delete="confirmDeleteExtension"
        />
      </card-wrapper>
    </template>

    <template #footer>
      <card-wrapper>
        <menu-item type="info" @click="handleImportExtension" icon="sym_o_upload">
          {{ $t(i18n.IMPORT_EXTENSION) }}
        </menu-item>
        <menu-item type="info" @click="openInstallFromUrl" icon="sym_o_link">
          {{ $t(i18n.INSTALL_FROM_URL) }}
        </menu-item>
      </card-wrapper>
    </template>
  </container-layout>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from 'src/boot/api';
import type { ExtensionMeta } from 'orgnote-api';
import { DefaultCommands, i18n } from 'orgnote-api';
import CardWrapper from 'src/components/CardWrapper.vue';
import ActionButton from 'src/components/ActionButton.vue';
import AppDropdown from 'src/components/AppDropdown.vue';
import ExtensionItem from 'src/components/ExtensionItem.vue';
import MenuItem from './MenuItem.vue';
import ContainerLayout from 'src/components/ContainerLayout.vue';
import AppGrid from 'src/components/AppGrid.vue';
import AppFlex from 'src/components/AppFlex.vue';
import EmptyState from 'src/components/EmptyState.vue';

interface TabOption {
  label: string;
  value: 'installed' | 'all';
}

const { t } = useI18n();

const tabOptions = computed<TabOption[]>(() => [
  { label: t(i18n.INSTALLED), value: 'installed' },
  { label: t(i18n.ALL_AVAILABLE), value: 'all' },
]);

const extensionStore = api.core.useExtensions();
const notifications = api.core.useNotifications();
const confirmationModal = api.ui.useConfirmationModal();

const selectedTab = ref<TabOption>(tabOptions.value[0]!);

const installedExtensions = computed(() => extensionStore.extensions ?? []);

const availableExtensions = ref<ExtensionMeta[]>([]);

const displayedExtensions = computed(() => {
  if (selectedTab.value.value === 'installed') {
    return installedExtensions.value;
  }
  return availableExtensions.value;
});

const emptyMessageKey = computed(() => {
  if (selectedTab.value.value === 'installed') {
    return i18n.NO_EXTENSIONS_INSTALLED;
  }
  return i18n.NO_EXTENSIONS_AVAILABLE;
});

const refresh = async () => {
  await extensionStore.sync();
  if (selectedTab.value.value === 'all') {
    await fetchAvailableExtensions();
  }
};

const fetchAvailableExtensions = async () => {
  // TODO: implement fetching from extension registry
  console.log('fetchAvailableExtensions: not implemented yet');
  availableExtensions.value = [];
};

const enableExtension = async (name: string) => {
  await extensionStore.enableExtension(name);
};

const disableExtension = async (name: string) => {
  await extensionStore.disableExtension(name);
};

const confirmDeleteExtension = async (name: string) => {
  const confirmed = await confirmationModal.confirm({
    title: i18n.DELETE_EXTENSION,
    message: i18n.CONFIRM_DELETE_EXTENSION,
    confirmText: i18n.DELETE,
    cancelText: i18n.CANCEL,
  });

  if (!confirmed) {
    return;
  }

  await extensionStore.deleteExtension(name);
};

const openInstallDialog = async () => {
  // TODO: implement install dialog
  console.log('openInstallDialog: not implemented yet');
  notifications.notify({ message: 'Install dialog not implemented yet', level: 'warning' });
};

const handleImportExtension = () => {
  api.core.useCommands().execute(DefaultCommands.IMPORT_EXTENSION);
};

const openInstallFromUrl = async () => {
  // TODO: implement install from URL using completion input
  console.log('openInstallFromUrl: not implemented yet');
  notifications.notify({ message: 'Install from URL not implemented yet', level: 'warning' });
};

onMounted(() => {
  refresh();
});
</script>

<style lang="scss" scoped>
.extensions-list {
  height: 100%;
  overflow-y: auto;
}
</style>
