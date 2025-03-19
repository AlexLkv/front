import React, { useEffect, useRef, useState } from "react";

const SIGNALING_SERVER_URL = "ws://localhost:8000/ws";
const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ws = useRef(null);
  const peerConnection = useRef(null);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket(SIGNALING_SERVER_URL);

    ws.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);

      if (data.offer) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        ws.current.send(JSON.stringify({ answer }));
      } else if (data.answer) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    return () => ws.current.close();
  }, []);

  const startCall = async () => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current.send(JSON.stringify({ candidate: event.candidate }));
      }
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    ws.current.send(JSON.stringify({ offer }));

    setIsCalling(true);
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted style={{ width: "300px", marginRight: "10px" }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: "300px" }} />
      <br />
      <button onClick={startCall} disabled={isCalling}>
        {isCalling ? "Calling..." : "Start Call"}
      </button>
    </div>
  );
}

export default VideoChat;
