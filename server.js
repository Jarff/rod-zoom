const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
//We our mounting the peer server
const peerServer = ExpressPeerServer(server, {
    debug: true
});

//We set the view engine for express
app.set('view engine', 'ejs');
//We define our public files to express
app.use(express.static('public'));
app.use('/peerjs', peerServer);
app.get('/', (request, response) => {
    //When we enter index we create a new room and redirect to it
    response.redirect(`/${uuidv4()}`);
});

//URL for the rooms
app.get('/:room', (request, response) => {
    response.status(200).render('room', { roomId: request.params.room });
});

//Listener for a user is conneted
io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        //We broadcast to the room that a user connected
        socket.to(roomId).broadcast.emit('user-connected', userId);

        //We want to listen the received messages
        socket.on('message', (message) => {
            io.to(roomId).emit('createMessage', message);
        });
    });
});

server.listen(process.env.PORT || 3030);