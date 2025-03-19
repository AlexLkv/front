const socket = io();

let localStream;
let peerConnections = {};
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// Request access to camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    addVideoStream('local', stream);
  })
  .catch(error => {
    console.error('Error accessing media devices.', error);
  });

// Add a video stream to the UI
function addVideoStream(id, stream) {
  const videosContainer = document.getElementById('videos');
  let video = document.getElementById(id);
  if (!video) {
    video = document.createElement('video');
    video.id = id;
    videosContainer.appendChild(video);
  }
  video.srcObject = stream;
  video.autoplay = true;
  video.playsinline = true;
}

// Create room button
document.getElementById('createRoomBtn').addEventListener('click', () => {
  socket.emit('createRoom');
});

// Join room button
document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomIdInput').value;
  if (roomId) {
    socket.emit('joinRoom', roomId);
  } else {
    alert('Please enter a room ID');
  }
});

// Room created event
socket.on('roomCreated', (roomId) => {
  alert(`Room created with ID: ${roomId}`);
  document.getElementById('roomIdInput').value = roomId;
});

// Joined room event
socket.on('joinedRoom', (roomId) => {
  alert(`Joined room: ${roomId}`);
});

// New user joined event
socket.on('userJoined', (userId) => {
  createPeerConnection(userId, true);
});

// User left event
socket.on('userLeft', (userId) => {
  if (peerConnections[userId]) {
    peerConnections[userId].close();
    delete peerConnections[userId];
    const video = document.getElementById(userId);
    if (video) {
      video.remove();
    }
  }
});

// Handle signaling data
socket.on('signal', (data) => {
  const { from, signal } = data;
  if (!peerConnections[from]) {
    createPeerConnection(from, false);
  }
  if (signal.type === 'offer') {
    peerConnections[from].setRemoteDescription(new RTCSessionDescription(signal));
    peerConnections[from].createAnswer()
      .then(answer => {
        peerConnections[from].setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: answer });
      })
      .catch(error => console.error('Error creating answer', error));
  } else if (signal.type === 'answer') {
    peerConnections[from].setRemoteDescription(new RTCSessionDescription(signal));
  } else if (signal.candidate) {
    peerConnections[from].addIceCandidate(new RTCIceCandidate(signal.candidate));
  }
});

// Create a peer connection
function createPeerConnection(userId, isOfferer) {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[userId] = peerConnection;

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    addVideoStream(userId, event.streams[0]);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: userId, signal: { candidate: event.candidate } });
    }
  };

  if (isOfferer) {
    peerConnection.createOffer()
      .then(offer => {
        peerConnection.setLocalDescription(offer);
        socket.emit('signal', { to: userId, signal: offer });
      })
      .catch(error => console.error('Error creating offer', error));
  }
}
