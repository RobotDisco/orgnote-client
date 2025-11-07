<template>
  <q-menu context-menu :target="props.target" ref="qMenuRef">
    <slot />
  </q-menu>
</template>

<script lang="ts" setup>
import { QMenu } from 'quasar';
import { ref } from 'vue';

const props = defineProps<{
  target?: boolean | string | Element;
}>();

const qMenuRef = ref<InstanceType<typeof QMenu> | null>(null);

const open = () => {
  if (!qMenuRef.value) return;
  qMenuRef.value.show();
};

const close = () => {
  if (!qMenuRef.value) return;
  qMenuRef.value.hide();
};

defineExpose({
  open,
  close,
});
</script>
