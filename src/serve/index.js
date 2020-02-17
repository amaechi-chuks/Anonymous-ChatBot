const app = require('http').createServer();
const io = module.exports.io = require('socket.io')(app);
const SocketManager =  require('./SocketManager')

const PORT = process.env.PORT || 3001;
io.on('connection', SocketManager );

app.listen(PORT, ()=>{
    console.log(`App is runnning at Port: ${PORT}`);
});
