import { useEffect, useRef, useState } from "react";

import { useSocket } from "@/_context/SocketContext";

const ICE_SERVERS = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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

		// 1. Get user media
		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));
			setStreamReady(true);
		});

		// 2. When remote track is received
		pc.ontrack = (event) => {
			const remoteStream = event.streams[0];
			if (remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = remoteStream;
			}
		};

		// 3. Handle ICE candidates
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket?.emit("ice-candidate", { candidate: event.candidate, roomId });
			}
		};

		// 4. Signaling handlers
		socket?.on("offer", async ({ sdp }) => {
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
				console.error("Error adding ICE candidate:", e);
			}
		});

		// 5. Controlled signaling: Initiator only sends offer *after* the other side signals readiness
		if (isInitiator) {
			socket?.emit("ready", { roomId });

			const handleReady = async () => {
				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);
				socket?.emit("offer", { sdp: offer, roomId });
			};

			socket?.on("ready", handleReady);

			return () => {
				socket?.off("ready", handleReady);
			};
		}

		return () => {
			pc.close();
			socket?.off("offer");
			socket?.off("answer");
			socket?.off("ice-candidate");
		};
	}, [roomId, isInitiator, socket]);

	return { localVideoRef, remoteVideoRef, streamReady, setStreamReady };
}
