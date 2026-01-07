// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // allow connections from any origin
});

// Rooms structure
const rooms = {}; // { roomID: [socket1, socket2] }

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('join_room', (data) => {
    // Handle both old (string) and new (object) formats slightly gracefully or just assume new
    let roomID, name;
    if (typeof data === 'object') {
      roomID = data.room;
      name = data.name;
    } else {
      roomID = data;
      name = 'Anonymous';
    }

    // Attach name to socket object for easy retrieval
    socket.userName = name;

    if (!rooms[roomID]) rooms[roomID] = [];
    rooms[roomID].push(socket.id);
    socket.join(roomID);

    if (rooms[roomID].length === 2) {
      // Get the two sockets
      const socket1 = io.sockets.sockets.get(rooms[roomID][0]);
      const socket2 = io.sockets.sockets.get(rooms[roomID][1]);

      // Notify both users they are paired, sending the *other* person's name
      // To socket1, send socket2's name
      if (socket1) socket1.emit('paired', { room: roomID, initiator: socket.id, remoteName: socket2 ? socket2.userName : 'Partner' });
      // To socket2, send socket1's name
      if (socket2) socket2.emit('paired', { room: roomID, initiator: socket.id, remoteName: socket1 ? socket1.userName : 'Partner' });

      console.log(`Room ${roomID} is ready. ${socket1?.userName} <-> ${socket2?.userName}`);
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

  // Disconnect
  socket.on('disconnect', () => {
    for (const roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
      if (rooms[roomID].length === 0) delete rooms[roomID];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
