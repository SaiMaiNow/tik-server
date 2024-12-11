const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

const activeConnections = {}; // Store active TikTok Live connections

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', async ({ tiktokUsername }) => {
    console.log(`User joined to watch: ${tiktokUsername}`);
    socket.join(tiktokUsername); // Join the room for this TikTok username

    if (!activeConnections[tiktokUsername]) {
      // Create a new connection if it doesn't exist
      const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

      try {
        await tiktokLiveConnection.connect();
        activeConnections[tiktokUsername] = tiktokLiveConnection;

        // Handle chat events
        tiktokLiveConnection.on('chat', (data) => {
          const message = {
            type: 'chat',
            username: data.uniqueId,
            comment: data.comment,
          };
          io.to(tiktokUsername).emit('tiktok-data', message); // Emit to room
        });

        // Handle gift events
        tiktokLiveConnection.on('gift', (data) => {
          const message = {
            type: 'gift',
            username: data.uniqueId,
            giftId: data.giftId,
            giftName: data.giftName,
          };
          io.to(tiktokUsername).emit('tiktok-data', message); // Emit to room
        });

        console.log(`Connected to TikTok Live for ${tiktokUsername}`);
      } catch (error) {
        console.error(`Failed to connect to ${tiktokUsername}:`, error);
        socket.emit('error', `Failed to connect to ${tiktokUsername}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
