<template>
  <div ref="wrapperRef" class="context-menu-trigger" @contextmenu.stop.prevent="handleContextMenu">
    <slot />
    <q-menu v-if="!disabled" context-menu :target="wrapperRef" ref="qMenuRef">
      <div v-for="(item, index) of actions" :key="index" class="context-menu-item">
        <command-action-button
          v-if="isCommandAction(item)"
          @click="handleItem()"
          :command="item.command"
          alignment="left"
          :data="data"
          include-text
          size="sm"
        />
        <action-button v-else @click="handleManualAction(item)" :icon="item.icon" size="sm">
          <template v-if="item.title" #text>{{ item.title }}</template>
        </action-button>
      </div>
    </q-menu>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { QMenu } from 'quasar';
import type {
  ContextMenuAction,
  ContextMenuActionCommand,
  ContextMenuGroup,
  ContextMenuManualAction,
} from 'orgnote-api';
import CommandActionButton from 'src/containers/CommandActionButton.vue';
import ActionButton from 'src/components/ActionButton.vue';
import { api } from 'src/boot/api';

const props = defineProps<{
  group: ContextMenuGroup;
  data?: unknown;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  open: [];
}>();

const qMenuRef = ref<InstanceType<typeof QMenu>>();
const wrapperRef = ref<HTMLElement>();

const contextMenuStore = api.ui.useContextMenu();

const actions = computed<ContextMenuAction[]>(() =>
  contextMenuStore.getContextMenuActions(props.group),
);

const isCommandAction = (item: ContextMenuAction): item is ContextMenuActionCommand =>
  'command' in item;

const handleContextMenu = () => {
  if (props.disabled) return;
  open();
};

const open = () => {
  emit('open');
  qMenuRef.value?.show();
};

const close = () => {
  qMenuRef.value?.hide();
};

defineExpose({
  open,
  close,
});

const handleItem = () => {
  close();
};

const handleManualAction = (item: ContextMenuManualAction) => {
  item.handler(props.data);
  close();
};
</script>

<style lang="scss" scoped>
.context-menu-trigger {
  display: contents;
}

.context-menu-item {
  @include flexify(row, flex-start, center, var(--gap-sm));

  & {
    padding: var(--context-menu-item-padding);
    cursor: pointer;
  }

  &:hover,
  &:active {
    background: var(--context-menu-item-hover-bg);
  }
}
</style>
