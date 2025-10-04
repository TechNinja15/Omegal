// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // { roomID: [socket1, socket2] }

// Serve frontend
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'client.html');
  res.sendFile(filePath);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room by code
  socket.on('join_room', (roomID) => {
    if (!rooms[roomID]) rooms[roomID] = [];
    rooms[roomID].push(socket.id);
    socket.join(roomID);

    if (rooms[roomID].length === 2) {
      io.to(roomID).emit('paired', { room: roomID });
      console.log(`Room ${roomID} is ready`);
    } else {
      socket.emit('waiting');
      console.log(`Waiting for friend in room ${roomID}`);
    }
  });

  // Text chat
  socket.on('message', ({ room, text }) => {
    socket.to(room).emit('message', { from: socket.id, text });
  });

  // WebRTC signaling
  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    // Remove socket from rooms
    for (const roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
      if (rooms[roomID].length === 0) delete rooms[roomID];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
