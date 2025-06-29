import { useEffect, useRef, useState } from "react";

import type { DefaultEventsMap } from "@socket.io/component-emitter";
import type { Socket } from "socket.io-client";
import { supabase } from '@/lib/supabase';
import { useNavigate } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

const ICE_SERVERS = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		// Add TURN server for production use
	],
};

export function useWebRTC(roomId: string, isInitiator: boolean) {
	const { socket } = useSocket();
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	const [streamReady, setStreamReady] = useState(false);
	const peerConnection = useRef<RTCPeerConnection | null>(null);
	const remoteStreamRef = useRef<MediaStream | null>(null);

	const navigate = useNavigate()

	const cleanUp = (pc: RTCPeerConnection, socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {
		pc.close();
		pc.ontrack = null;
		pc.onicecandidate = null;
		pc.onconnectionstatechange = null;
		pc.getSenders().forEach(sender => sender.track?.stop());
		socket.off("offer");
		socket.off("answer");
		socket.off("ice-candidate");
		socket.off("ready");
	}

	async function addIceCandidateToParticipant(socketId: string, candidate: RTCIceCandidateInit) {
		const { data, error } = await supabase
			.from("participants")
			.select("ice_candidates")
			.eq("socket_id", socketId)
			.single();

		if (error) {
			console.error("❌ Failed to fetch participant for ICE update:", error);
			return;
		}

		const updatedCandidates = Array.isArray(data.ice_candidates)
			? [...data.ice_candidates, candidate]
			: [candidate];

		const { error: updateError } = await supabase
			.from("participants")
			.update({ ice_candidates: updatedCandidates })
			.eq("socket_id", socketId);

		if (updateError) {
			console.error("❌ Failed to update ICE candidates:", updateError);
		}
	}


	useEffect(() => {
		if (!roomId || !socket) return;

		const pc = new RTCPeerConnection(ICE_SERVERS);
		peerConnection.current = pc;

		// Get local stream and add to peer connection
		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}
			if (pc.signalingState === "closed") {
				console.warn("🚫 Tried to addTrack on a closed connection");
				return;
			}

			stream.getTracks().forEach(track => {
				pc.addTrack(track, stream);
			});
			setStreamReady(true);
		});

		pc.ontrack = (event) => {
			console.log("📨 receiving remote media")
			const remoteStream = event.streams[0];
			remoteStreamRef.current = remoteStream;

			const tryAttach = () => {
				if (remoteVideoRef.current) {
					remoteVideoRef.current.srcObject = remoteStream;
				} else {
					setTimeout(tryAttach, 100);
				}
			};

			tryAttach();
		};

		// Handle incoming ICE candidates
		socket.on("ice-candidate", async ({ candidate }) => {
			try {
				await pc.addIceCandidate(new RTCIceCandidate(candidate));
				console.log("✅ Added ICE candidate");
			} catch (e) {
				console.error("❌ Error adding ICE candidate", e);
			}
		});

		socket.on("room-full", () => {
			alert("This debate room is already full.");
			navigate("/"); // or redirect to a watch-only page
		});

		// Handle offer
		socket.on("offer", async ({ sdp }) => {
			console.log("📨 Received offer");
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
			const answer = await pc.createAnswer();
			if (pc.signalingState === "stable") {
				console.warn("On Offer - 🛑 Skipping setLocalDescription: already stable");
			} else {
				await pc.setLocalDescription(answer);
			}
			socket.emit("answer", { sdp: answer, roomId });
		});

		// Handle answer
		socket.on("answer", async ({ sdp }) => {
			console.log("📨 Received answer");
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
		});

		// Send ICE candidates to peer
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket.emit("ice-candidate", { candidate: event.candidate, roomId });
				console.log("📤 Sending ICE candidate");
				addIceCandidateToParticipant(socket.id ?? "", event.candidate.toJSON()); // 👈 Add here
			}
		};

		// Join the room
		socket.emit("ready", { roomId });

		if (isInitiator) {
			socket.on("ready", async () => {
				console.log("🚀 Creating and sending offer");
				const offer = await pc.createOffer();
				if (pc.signalingState === "stable") {
					console.warn("On Ready - 🛑 Skipping setLocalDescription: already stable");
				} else {
					await pc.setLocalDescription(answer);
				}
				socket.emit("offer", { sdp: offer, roomId });
			});
		}

		// 💡 Handle disconnections
		pc.onconnectionstatechange = () => {
			const state = pc.connectionState;
			supabase
				.from("participants")
				.update({ peer_connection_status: state })
				.eq("socket_id", socket.id);
			if (["disconnected", "failed", "closed"].includes(state)) {
				console.warn("Peer connection lost:", state);
				cleanUp(pc, socket)
			}
		};

		return () => {
			cleanUp(pc, socket);
		};
	}, [roomId, isInitiator, socket]);

	return {
		localVideoRef,
		remoteVideoRef,
		streamReady,
		setStreamReady,
	};
}


