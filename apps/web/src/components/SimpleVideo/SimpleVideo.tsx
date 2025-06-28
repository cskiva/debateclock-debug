import { useEffect, useRef, useState } from "react";

// components/SimpleVideo.tsx
import { useSocket } from "@/_context/SocketContext";

interface SimpleVideoProps {
  roomId: string;
  isLocal: boolean;
  className?: string;
}

// Global peer connection and local stream to share between components
let globalPeerConnection: RTCPeerConnection | null = null;
let globalLocalStream: MediaStream | null = null;
let remoteVideoElement: HTMLVideoElement | null = null;

export function SimpleVideo({
  roomId,
  isLocal,
  className = "",
}: SimpleVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (isLocal) {
      // Get local video only once
      if (!globalLocalStream) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((localStream) => {
            console.log("🎥 Got local stream");
            globalLocalStream = localStream;
            setStream(localStream);

            if (videoRef.current) {
              videoRef.current.srcObject = localStream;
            }

            // Set up peer connection
            if (socket) {
              setupPeerConnection(localStream);
            }
          })
          .catch((err) => console.error("❌ Error getting local stream:", err));
      } else {
        // Use existing local stream
        setStream(globalLocalStream);
        if (videoRef.current) {
          videoRef.current.srcObject = globalLocalStream;
        }
      }
    } else {
      // This is the remote video element
      remoteVideoElement = videoRef.current;
    }
  }, [isLocal, socket, roomId]);

  const setupPeerConnection = (localStream: MediaStream) => {
    if (!socket || globalPeerConnection) return;

    console.log("🔗 Setting up peer connection");

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    globalPeerConnection = pc;

    // Add local stream tracks
    localStream.getTracks().forEach((track) => {
      console.log(`➕ Adding ${track.kind} track`);
      pc.addTrack(track, localStream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("📺 Received remote track:", event.track.kind);
      const [remoteStream] = event.streams;

      if (remoteVideoElement) {
        console.log("🎬 Setting remote video stream");
        remoteVideoElement.srcObject = remoteStream;
      } else {
        console.warn("⚠️ Remote video element not found");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");
        socket.emit("webrtc-ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log("🔌 Connection state:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state:", pc.iceConnectionState);
    };

    // Socket event handlers
    socket.on("webrtc-offer", async (data) => {
      console.log("📨 Received offer");
      try {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { roomId, answer });
        console.log("📤 Sent answer");
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    });

    socket.on("webrtc-answer", async (data) => {
      console.log("📨 Received answer");
      try {
        await pc.setRemoteDescription(data.answer);
        console.log("✅ Set remote description from answer");
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    });

    socket.on("webrtc-ice-candidate", async (data) => {
      console.log("📨 Received ICE candidate");
      try {
        await pc.addIceCandidate(data.candidate);
        console.log("✅ Added ICE candidate");
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    });

    socket.on("user-joined", async () => {
      console.log("👤 User joined, creating offer");
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { roomId, offer });
        console.log("📤 Sent offer");
      } catch (error) {
        console.error("❌ Error creating offer:", error);
      }
    });
  };

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
        {isLocal ? "You" : "Opponent"}
      </div>
      <div className="absolute top-2 right-2">
        <div
          className={`w-3 h-3 rounded-full ${
            stream ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </div>
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
        {isLocal ? "LOCAL" : "REMOTE"}
      </div>
    </div>
  );
}
