import { useCallback, useState } from 'react';
import { readBoolFromStorage, writeBoolToStorage } from '../../utils/storageUtils';

export const usePersistentToggle = (
  storageKey: string,
  defaultOpen: boolean
): [boolean, (open: boolean) => void] => {
  const [open, setOpen] = useState(() => readBoolFromStorage(storageKey, defaultOpen));

  const setOpenPersisted = useCallback(
    (next: boolean) => {
      setOpen(next);
      writeBoolToStorage(storageKey, next);
    },
    [storageKey]
  );

  return [open, setOpenPersisted];
};
