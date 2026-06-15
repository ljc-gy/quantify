import { io } from 'socket.io-client';

// Dev: Vite proxy forwards /socket.io → localhost:3001.
// Production: same-origin.  Empty URL so the client derives origin from the page.

// Default namespace — market:tick stream
const apiSocket = io('', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

// /realtime namespace — dashboard:snapshot stream
const socket = io('/realtime', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export function connect() {
  if (!socket.connected) socket.connect();
  if (!apiSocket.connected) apiSocket.connect();
}

export function disconnect() {
  if (socket.connected) socket.disconnect();
  if (apiSocket.connected) apiSocket.disconnect();
}

export function subscribe(codes) {
  socket.emit('subscribe', codes);
  apiSocket.emit('subscribe', codes);
}

// --- Tick stream (individual stocks) — default namespace ---

export function onTick(callback) {
  apiSocket.on('market:tick', callback);
  return () => apiSocket.off('market:tick', callback);
}

// --- Dashboard snapshot (risk + overview numbers) — /realtime namespace ---

export function onSnapshot(callback) {
  socket.on('dashboard:snapshot', callback);
  return () => socket.off('dashboard:snapshot', callback);
}

export { socket, apiSocket };
