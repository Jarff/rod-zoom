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
var users = [];
//We set the view engine for express
app.set('view engine', 'ejs');
//We define our public files to express
app.use(express.static('public'));
app.use('/peerjs', peerServer);
app.get('/', (request, response) => {
    response.status(200).render('welcome');
    //When we enter index we create a new room and redirect to it
    // response.redirect(`/${uuidv4()}`);
});

//URL for the rooms
app.get('/room/:room', (request, response) => {
    response.status(200).render('room', { roomId: request.params.room });
});

app.get('/create', (request, response) => {
    response.redirect(`/room/${uuidv4()}`);
});

//Listener for a user is conneted
io.on('connection', (socket, userId) => {
    socket.on('join-room', (roomId, userId) => {
        // users[userId] = {name: 'Internauta'};
        users.push({id: userId, name: "Internauta " + (users.length + 1)});
        // console.log(users);
        // users[userId] = {}
        socket.join(roomId);
        //We broadcast to the room that a user connected
        socket.to(roomId).broadcast.emit('user-connected', userId);
        //We let know all users connected that a new user joinned the room
        io.to(roomId).emit('serverMessage', users.filter((user) => user.id === userId)[0].name+' se unió', users);
        // io.to(roomId).emit('serverMessage', users[userId].name + ' se unió', users);

        //We want to listen the received messages
        socket.on('message', (message) => {
            io.to(roomId).emit('createMessage', message);
        });

        //Handler when disconect
        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
            //We let all users connected that a user left the room
            io.to(roomId).emit('createMessage', users.filter((user) => user.id === userId)[0].name+' salió');
            users = users.filter((user) => { return user.id !== userId })
        });
    });
});

server.listen(process.env.PORT || 3030);