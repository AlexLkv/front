const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallButton = document.getElementById("startCall");

const ws = new WebSocket("ws://localhost:8000/ws");
let localStream;
let peerConnection;
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ answer }));
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

async function startCall() {
    peerConnection = new RTCPeerConnection(config);
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ offer }));
}

startCallButton.addEventListener("click", startCall);
