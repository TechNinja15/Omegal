// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingUser = null; // queue for pairing

// Serve frontend
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'client.html');
  console.log('Serving file:', filePath);
  res.sendFile(filePath);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_partner', () => {
    if (waitingUser && waitingUser !== socket.id) {
      // pair users
      const room = 'room-' + socket.id + '-' + waitingUser;
      socket.join(room);
      io.to(waitingUser).socketsJoin(room);

      io.to(room).emit('paired', { room });
      waitingUser = null;
      console.log('Paired users in room:', room);
    } else {
      waitingUser = socket.id;
      socket.emit('waiting');
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
    if (waitingUser === socket.id) waitingUser = null;
    console.log('User disconnected:', socket.id);
  });
});

// Instead of hardcoding 3000:
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
