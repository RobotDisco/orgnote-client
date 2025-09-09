type Timer = NodeJS.Timeout | number;

interface DebouncedFunction<F extends (...args: Parameters<F>) => ReturnType<F>> {
  (...args: Parameters<F>): void;
  cancel: () => void;
}

export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  waitFor = 100,
): DebouncedFunction<F> {
  let timeout: Timer;

  const debouncedFunction = (...args: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunction;
}
