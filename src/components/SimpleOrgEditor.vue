<template>
  <textarea cols="30" id="" name="" rows="10" v-model="model"></textarea>
</template>

<script lang="ts" setup>
const model = defineModel<string>('');
</script>
