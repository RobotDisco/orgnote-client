<template>
  <app-flex class="footer" row center align-center>
    <slot />
  </app-flex>
</template>

<script lang="ts" setup>
import AppFlex from 'src/components/AppFlex.vue';
</script>

<style lang="scss" scoped>
.footer {
  & {
    width: 100%;
    height: var(--footer-height);
    background: var(--footer-bg);
    border-top: var(--footer-border-top);
    padding: var(--footer-padding);
    padding-bottom: calc(var(--footer-padding-bottom, 0px) + var(--device-padding-bottom));
    position: absolute;
    bottom: 0;
    box-sizing: content-box;
  }
}
</style>
