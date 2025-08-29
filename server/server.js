  import { Server } from "socket.io";
  import http from "http";
  import express from "express";

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  const rooms = {};

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("createRoom", ({ roomCode, name }, callback) => {
      if (rooms[roomCode]) {
        callback({ success: false, message: "Room already exists" });
        return;
      }
      rooms[roomCode] = { players: [{ id: socket.id, name }] };
      socket.join(roomCode);
      callback({ success: true });
    });

    socket.on("joinRoom", ({ roomCode, name }, callback) => {
      if (rooms[roomCode]) {
        rooms[roomCode].players.push({ id: socket.id, name });
        socket.join(roomCode);
        callback({ success: true });

        if (rooms[roomCode].players.length === 2) {
          rooms[roomCode].players.forEach((p, i) => {
            io.to(p.id).emit("gameStart", {
              assignedPlayer: i + 1,
              playerNames: rooms[roomCode].players.map((pl) => pl.name),
            });
          });
        }
      } else {
        callback({ success: false, message: "Room not found" });
      }
    });

    socket.on("numberClicked", ({ roomCode, num, name }) => {
      if (rooms[roomCode]) {
        io.to(roomCode).emit("markNumber", { num, name });
      }
    });

    socket.on("updateLines", ({ roomCode, lines, name }) => {
      if (!rooms[roomCode]) return;

      if (lines >= 5) {
        io.to(roomCode).emit("gameResult", { result: `${name} Wins 🎉` });

        rooms[roomCode].players.forEach((p) => {
          if (p.name !== name) {
            io.to(p.id).emit("gameResult", { result: "You Lose 😢" });
          }
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      for (const [roomCode, room] of Object.entries(rooms)) {
        room.players = room.players.filter((p) => p.id !== socket.id);
        if (room.players.length === 0) delete rooms[roomCode];
      }
    });
  });

  server.listen(4000, () => console.log("✅ Server running on port 4000"));
