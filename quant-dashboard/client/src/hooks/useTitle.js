import { useEffect } from 'react';

/**
 * Sets document.title on mount and restores on unmount.
 */
export function useTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | Quant Dashboard` : 'Quant Dashboard';
    return () => { document.title = prev; };
  }, [title]);
}
