/* eslint-disable no-multi-assign */
const app = require('http').createServer();
const io = (module.exports.io = require('socket.io')(app));

const PORT = process.env.PORT || 8000;

// eslint-disable-next-line import/no-unresolved
const SocketManager = require('./SocketManager');

io.on('connection', SocketManager);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Connected to port:${PORT}`);
});
