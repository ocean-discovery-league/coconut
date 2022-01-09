let socket;

export function getSocketIO() {
  if (!socket) {
    socket = io.connect();
    socket.on('error', console.error);
    socket.on('connect', () => {
      console.log('web socket connected');
    });
    socket.on('disconnect', () => console.log('web socket disconnected'));
  }
  return socket;
}
