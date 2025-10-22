import { $, QRL, useSignal } from "@builder.io/qwik";

const args_eq = <A extends unknown[]>(a: A, b: A): boolean => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
};

export const useDebouncer = <A extends unknown[], R>(
  fn: QRL<(...args: A) => R>,
  delay: number,
): QRL<(...args: A) => void> => {
  const lastCall = useSignal<{ timeout: NodeJS.Timeout, args: A } | null>(null);
 
  return $((...args: A): void => {
    if (lastCall.value != null) {
      clearTimeout(lastCall.value.timeout);
    }
    if (lastCall.value == null || !args_eq(lastCall.value.args, args)) {
      fn(...args);
    }

    lastCall.value = {
      args,
      timeout: setTimeout(() => {
        lastCall.value = null;
      }, delay),
    };
  });
};
