import { useState, useEffect, useRef, useCallback } from 'react';
import { connect, disconnect, onTick, onSnapshot, subscribe } from '../services/socket';

/**
 * Hook that manages WebSocket lifecycle and provides a live data stream.
 *
 * Returns `tickData` (latest market:tick array), `snapshotData` (dashboard:snapshot),
 * and `connected` status.
 *
 * Connection is established once on mount and torn down on unmount.
 * Re-subscribes automatically when `codes` change.
 */
export function useWebSocket(codes = []) {
  const [tickData, setTickData] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);

  // Effect 1 — connection lifecycle (mount / unmount only)
  useEffect(() => {
    connect();
    connectedRef.current = true;
    setConnected(true);

    const unsubTick = onTick((ticks) => {
      if (connectedRef.current) setTickData(ticks);
    });

    const unsubSnapshot = onSnapshot((snap) => {
      if (connectedRef.current) setSnapshotData(snap);
    });

    return () => {
      connectedRef.current = false;
      unsubTick();
      unsubSnapshot();
      disconnect();
      setConnected(false);
    };
  }, []);

  // Effect 2 — subscribe whenever the codes list changes
  const codesKey = JSON.stringify(codes);
  useEffect(() => {
    if (codes.length > 0 && connectedRef.current) {
      subscribe(codes);
    }
  }, [codesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const resubscribe = useCallback((newCodes) => {
    subscribe(newCodes);
  }, []);

  return { tickData, snapshotData, connected, resubscribe };
}
