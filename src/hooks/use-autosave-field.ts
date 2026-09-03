import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved';

export function useAutosaveField(initialValue: string, onSave: (value: string) => Promise<unknown> | void, delay = 500) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(initialValue);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync local draft when the underlying task field changes externally
    setValue(initialValue);
    savedRef.current = initialValue;
  }, [initialValue]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const onChange = (next: string) => {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (next === savedRef.current) return;
      setStatus('saving');
      await onSave(next);
      savedRef.current = next;
      setStatus('saved');
      setTimeout(() => setStatus(prev => (prev === 'saved' ? 'idle' : prev)), 1500);
    }, delay);
  };

  return { value, onChange, status };
}
