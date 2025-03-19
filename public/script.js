const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");

let peer;
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localVideo.srcObject = stream;
        socket.emit("join-room", roomId);

        socket.on("user-connected", (userId) => {
            peer = new SimplePeer({ initiator: true, trickle: false, stream });

            peer.on("signal", (data) => {
                socket.emit("signal", { to: userId, signal: data });
            });

            peer.on("stream", (remoteStream) => {
                remoteVideo.srcObject = remoteStream;
            });

            socket.on("signal", (data) => {
                peer.signal(data.signal);
            });
        });

        socket.on("user-disconnected", () => {
            if (peer) peer.destroy();
        });
    })
    .catch((error) => console.error("Ошибка доступа к камере:", error));

