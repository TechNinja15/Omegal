// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingUser = null; // single waiting user for pairing

// serve frontend
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client.html');
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_partner', () => {
    if (waitingUser && waitingUser !== socket.id) {
      // pair users
      const room = 'room-' + socket.id + '-' + waitingUser;
      socket.join(room);
      io.to(waitingUser).socketsJoin(room);

      io.to(room).emit('paired', { room });
      waitingUser = null; // reset
      console.log('Paired users in room:', room);
    } else {
      waitingUser = socket.id;
      socket.emit('waiting');
    }
  });

  // text chat
  socket.on('message', ({ room, text }) => {
    socket.to(room).emit('message', { from: socket.id, text });
  });

  // signaling for video chat (WebRTC)
  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket.id) waitingUser = null;
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
