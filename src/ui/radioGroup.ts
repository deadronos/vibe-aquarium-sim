import type { KeyboardEvent } from 'react';

const RADIO_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

/** Implements the keyboard interaction expected from a group of ARIA radio buttons. */
export const onRadioGroupKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  if (!RADIO_KEYS.has(event.key)) return;
  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)')
  );
  if (radios.length === 0) return;
  const current = radios.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;

  event.preventDefault();
  let next = current;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = radios.length - 1;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (current + 1) % radios.length;
  } else {
    next = (current - 1 + radios.length) % radios.length;
  }
  radios[next]!.focus();
  radios[next]!.click();
};
