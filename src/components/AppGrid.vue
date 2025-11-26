<template>
  <div :class="gridClass" :style="gridStyles">
    <component :is="'style'" v-if="layoutCss">{{ layoutCss }}</component>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { StyleSize } from 'orgnote-api';

type GridSpan = number | string;

interface ItemLayout {
  span?: GridSpan;
  rowSpan?: GridSpan;
  col?: GridSpan;
  row?: GridSpan;
}

interface ResponsiveItemLayout extends ItemLayout {
  xs?: ItemLayout;
  sm?: ItemLayout;
  md?: ItemLayout;
  lg?: ItemLayout;
  xl?: ItemLayout;
}

export interface AppGridProps {
  cols?: number | string;
  gap?: StyleSize;
  responsive?: {
    xs?: number | string;
    sm?: number | string;
    md?: number | string;
    lg?: number | string;
    xl?: number | string;
  };
  layout?: ResponsiveItemLayout[];
}

const props = withDefaults(defineProps<AppGridProps>(), {
  cols: 1,
  gap: 'md',
  layout: () => [],
});

const uid = `app-grid-${Math.random().toString(36).substr(2, 9)}`;
const gridClass = computed(() => ['app-grid', uid]);

const formatCols = (val?: number | string): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') {
    return `repeat(${val}, minmax(0, 1fr))`;
  }
  return val;
};

const formatSpan = (val?: GridSpan): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return `span ${val}`;
  return val;
};

const formatRowSpan = (val?: GridSpan): string | undefined => {
  if (val === undefined) return undefined;
  if (typeof val === 'number') return `span ${val}`;
  return val;
};

const gridStyles = computed(() => {
  const styles: Record<string, string | undefined> = {
    '--grid-gap': `var(--gap-${props.gap})`,
    '--grid-cols-base': formatCols(props.cols),
  };

  if (props.responsive) {
    if (props.responsive.xs) styles['--grid-cols-xs'] = formatCols(props.responsive.xs);
    if (props.responsive.sm) styles['--grid-cols-sm'] = formatCols(props.responsive.sm);
    if (props.responsive.md) styles['--grid-cols-md'] = formatCols(props.responsive.md);
    if (props.responsive.lg) styles['--grid-cols-lg'] = formatCols(props.responsive.lg);
    if (props.responsive.xl) styles['--grid-cols-xl'] = formatCols(props.responsive.xl);
  }

  return styles;
});

const generateItemCss = (selector: string, config: ItemLayout, breakpoint?: string): string => {
  const rules: string[] = [];
  if (config.span) rules.push(`grid-column: ${formatSpan(config.span)};`);
  if (config.rowSpan) rules.push(`grid-row: ${formatRowSpan(config.rowSpan)};`);
  if (config.col) rules.push(`grid-column-start: ${config.col};`);
  if (config.row) rules.push(`grid-row-start: ${config.row};`);

  if (rules.length === 0) return '';

  const ruleBlock = `${selector} { ${rules.join(' ')} }`;

  if (breakpoint) {
    const bpMap: Record<string, string> = {
      sm: '600px',
      md: '768px',
      lg: '1024px',
      xl: '1440px',
    };
    const minWidth = bpMap[breakpoint];
    if (minWidth) {
      return `@media (min-width: ${minWidth}) { ${ruleBlock} }`;
    }
  }
  return ruleBlock;
};

const layoutCss = computed(() => {
  if (!props.layout || props.layout.length === 0) return '';

  let css = '';
  props.layout.forEach((itemConfig, index) => {
    const selector = `.${uid} > *:nth-child(${index + 1})`;

    css += generateItemCss(selector, itemConfig);

    if (itemConfig.sm) css += generateItemCss(selector, itemConfig.sm, 'sm');
    if (itemConfig.md) css += generateItemCss(selector, itemConfig.md, 'md');
    if (itemConfig.lg) css += generateItemCss(selector, itemConfig.lg, 'lg');
    if (itemConfig.xl) css += generateItemCss(selector, itemConfig.xl, 'xl');
  });

  return css;
});
</script>

<style lang="scss" scoped>
.app-grid {
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: var(--grid-cols-base);
  width: 100%;

  @media (min-width: 600px) {
    grid-template-columns: var(--grid-cols-sm, var(--grid-cols-base));
  }

  @media (min-width: 768px) {
    grid-template-columns: var(--grid-cols-md, var(--grid-cols-sm, var(--grid-cols-base)));
  }

  @media (min-width: 1024px) {
    grid-template-columns: var(
      --grid-cols-lg,
      var(--grid-cols-md, var(--grid-cols-sm, var(--grid-cols-base)))
    );
  }

  @media (min-width: 1440px) {
    grid-template-columns: var(
      --grid-cols-xl,
      var(--grid-cols-lg, var(--grid-cols-md, var(--grid-cols-sm, var(--grid-cols-base))))
    );
  }
}
</style>
