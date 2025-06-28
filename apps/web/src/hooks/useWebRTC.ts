import { useEffect, useRef, useState } from "react";

import { useSocket } from "@/_context/SocketContext";

const ICE_SERVERS = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		// Add TURN server here for production
	],
};

export function useWebRTC(roomId: string, isInitiator: boolean) {
	const { socket } = useSocket();
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	const [streamReady, setStreamReady] = useState(false);
	const peerConnection = useRef<RTCPeerConnection | null>(null);

	useEffect(() => {
		const pc = new RTCPeerConnection(ICE_SERVERS);
		peerConnection.current = pc;

		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));
			setStreamReady(true);
		});

		pc.ontrack = (event) => {
			const remoteStream = event.streams[0];
			if (remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = remoteStream;
			}
		};

		socket?.on("offer", async ({ sdp }) => {
			if (!pc) return;
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			socket.emit("answer", { sdp: answer, roomId });
		});

		socket?.on("answer", async ({ sdp }) => {
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
		});

		socket?.on("ice-candidate", async ({ candidate }) => {
			try {
				await pc.addIceCandidate(new RTCIceCandidate(candidate));
			} catch (e) {
				console.error("Error adding ice candidate", e);
			}
		});

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket?.emit("ice-candidate", { candidate: event.candidate, roomId });
			}
		};

		// Initiator creates and sends offer
		if (isInitiator) {
			socket?.emit("ready", { roomId });
			socket?.on("ready", async () => {
				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);
				socket.emit("offer", { sdp: offer, roomId });
			});
		} else {
			socket?.emit("ready", { roomId });
		}

		return () => {
			pc.close();
			socket?.off("offer");
			socket?.off("answer");
			socket?.off("ice-candidate");
			socket?.off("ready");
		};
	}, [roomId, isInitiator, socket]);

	return { localVideoRef, remoteVideoRef, streamReady, setStreamReady };
}
