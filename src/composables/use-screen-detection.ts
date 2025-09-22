import { computed, effectScope } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { getNumericCssVar } from 'src/utils/css-utils';

export function createScreenDetection() {
  const { width } = useWindowSize({ includeScrollbar: true });
  const hasWindow = typeof window !== 'undefined';
  const tablet = hasWindow ? getNumericCssVar('--tablet') : 0;
  const desktop = hasWindow ? getNumericCssVar('--desktop') : 0;

  const desktopAbove = computed(() => width.value > desktop);
  const desktopBelow = computed(() => width.value < desktop);
  const tabletBelow = computed(() => width.value < tablet);
  const tabletAbove = computed(() => width.value >= tablet);
  const mobile = computed(() => width.value < tablet);

  return {
    screenWidth: width,
    desktopAbove,
    desktopBelow,
    tabletBelow,
    tabletAbove,
    mobile,
  };
}

let _screen: ReturnType<typeof createScreenDetection> | null = null;
let _scope: ReturnType<typeof effectScope> | null = null;

export function useScreenDetection() {
  if (_screen) return _screen;
  _scope = effectScope(true);
  _screen = _scope.run(createScreenDetection)!;
  return _screen;
}
