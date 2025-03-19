const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store rooms and their users
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle room creation
  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = [socket.id];
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  // Handle joining a room
  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].push(socket.id);
      socket.join(roomId);
      socket.to(roomId).emit('userJoined', socket.id);
      socket.emit('joinedRoom', roomId);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  // Handle signaling data
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal,
    });
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    for (const roomId in rooms) {
      const index = rooms[roomId].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].splice(index, 1);
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        } else {
          socket.to(roomId).emit('userLeft', socket.id);
        }
        break;
      }
    }
  });
});

// Generate a random room ID
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
