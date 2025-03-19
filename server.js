const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("🔗 Пользователь подключен:", socket.id);

    socket.on("create-room", () => {
        const roomId = randomUUID();
        socket.join(roomId);
        socket.emit("room-created", roomId);
        console.log(`✅ Комната создана: ${roomId}`);
    });

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("user-connected", socket.id);
        console.log(`📞 Пользователь ${socket.id} подключился к комнате ${roomId}`);

        socket.on("disconnect", () => {
            socket.broadcast.to(roomId).emit("user-disconnected", socket.id);
        });
    });

    socket.on("signal", (data) => {
        io.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
