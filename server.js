const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("user-connected", userId);

        socket.on("disconnect", () => {
            socket.broadcast.to(roomId).emit("user-disconnected", userId);
        });
    });

    socket.on("signal", (data) => {
        io.to(data.to).emit("signal", { from: data.from, signal: data.signal });
    });
});

server.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});
