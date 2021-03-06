const debug = true;

const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
//We should mute ourselfs video
myVideo.muted = true;
//Create peer connection
var peer = new Peer(undefined, {
    path: '/peerjs', //Actual root defined in server.js
    host: '/', //Whatever host
    port: (debug) ? 3030 : '443'
});
let userInfo = {};
let users = [];
//Our initial configuration for mic and camera
const mediaConstraints = {video: true, audio: true};
//Our global videoStream
let myVideoStream;
let constraints
//Promise for detecting camera and mic devices connected 
var enumeratorPromise = navigator.mediaDevices.enumerateDevices().then(function(devices) {
    var cam = devices.find(function(device) {
        return device.kind === "videoinput";
    });
    var mic = devices.find(function(device) {
        return device.kind === "audioinput";
    });
    constraints = {video:(cam && mediaConstraints.video) ? true : false, audio:(mic && mediaConstraints.audio) ? true : false};

    return navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                myVideoStream = stream;
                addVideoStream(myVideo, stream);

                //answer call from peer
                peer.on('call', call => {
                    console.log(users);
                    console.log(call);
                    call.answer(stream);
                    const video = document.createElement('video');
                    console.log('entra');
                    call.on('stream', (userVideoStream) => {
                        addVideoStream(video, userVideoStream);
                    });
                });

                //We listen for a new connection and share our stream
                socket.on('user-connected', (userId) => {
                    connectToNewUser(userId, stream);
                });

                //Logic for sending messages
                let msg = document.querySelector('input');
                let form = document.getElementById('send-message');

                form.addEventListener('submit', e => {
                    e.preventDefault();
                    sendMessage(msg.value);
                    //We clear the input
                    msg.value = '';
                });
            })
            .catch((err) => {
                console.error(err);
            });
});

//When the connection is opened with a ID (especified by peer)
peer.on('open', (id) => {
    //Tell the socket a user joinned the room
    socket.emit('join-room', ROOM_ID, id); 

});


//When the server emits the event
socket.on('createMessage', (message) => {
    // let name = (users[userId]) ? users[userId].name : 'Internauta';
    createMessage({name: "User", message: message});
});

//Listen for server Messages
socket.on('serverMessage', (message, _users) => {
    users = _users;
    createMessage({message: message});
});

//We listen when a user disconnect the room
socket.on('user-disconnected', (userId) => {
    // if(users[userId]) users[userId].call.close();
    document.getElementById(userId).parentNode.removeChild(document.getElementById(userId));
});

const connectToNewUser = (userId, stream) => {

    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    video.setAttribute('id', userId);
    call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove;
    });
}

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.style.backgroundColor = 'black';
    video.style.border = '1px solid yellow';
    //When we load all the media from this video
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
    //We update the icons if the user doesn't have mic, camera or both
    if(!constraints.video) setPlayVideo();
    if(!constraints.audio) setUnmuteButton();
}

const scrollToBottom = () => {
    let d = $('.main__chat_window');
    d.scrollTop(d.prop('scrollHeight'));
}

const muteUnmute = () => {
    if(myVideoStream.getAudioTracks()[0]){
        const enabled = myVideoStream.getAudioTracks()[0].enabled;
        if(enabled){
            setUnmuteButton();
            myVideoStream.getAudioTracks()[0].enabled = false;
        }else{
            setMuteButton();
            myVideoStream.getAudioTracks()[0].enabled = true;
        }
    }else{
        alert('No se ha detectado un microfono');
    }
}

const setMuteButton = () => {
    const html = `
    <i class="fas fa-microphone"></i>
    <span>Silenciar</span>
    `;
    document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
    const html = `
      <i class="unmute fas fa-microphone-slash"></i>
      <span>Hablar</span>
    `
    document.querySelector('.main__mute_button').innerHTML = html;
}

const playStop = () => {
    if(myVideoStream.getVideoTracks()[0]){
        let enabled = myVideoStream.getVideoTracks()[0].enabled;
        if (enabled) {
          myVideoStream.getVideoTracks()[0].enabled = false;
          setPlayVideo()
        } else {
          setStopVideo()
          myVideoStream.getVideoTracks()[0].enabled = true;
        }
    }else{
        alert('No se ha detectado una cámara');
    }
}

const setStopVideo = () => {
    const html = `
      <i class="fas fa-video"></i>
      <span>Stop Video</span>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}
  
const setPlayVideo = () => {
    const html = `
    <i class="stop fas fa-video-slash"></i>
        <span>Play Video</span>
    `
    document.querySelector('.main__video_button').innerHTML = html;
}

const sendMessage = (message) => {
    if((message !== '') && (message !== ' ')){
        socket.emit('message', message);
    }
}

const createMessage = (obj = {name, message}) => {
    let li_message = document.createElement('li');
    li_message.innerHTML = `<b>${(obj.name) ? obj.name+':' : ''} </b><br>${obj.message}`;
    document.querySelector('.messages').append(li_message);
    scrollToBottom();
}