import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSocket } from '../_context/SocketContext';

// WebRTC-specific types
interface WebRTCOffer {
	offer: RTCSessionDescriptionInit;
	roomId: string;
	to: string;
	from: string;
}

interface WebRTCAnswer {
	answer: RTCSessionDescriptionInit;
	roomId: string;
	to: string;
	from: string;
}

interface WebRTCIceCandidate {
	candidate: RTCIceCandidate;
	roomId: string;
	from: string;
}

interface WebRTCUserJoined {
	userId: string;
	roomId: string;
}

type RTCConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

interface UseWebRTCReturn {
	localVideoRef: RefObject<HTMLVideoElement | null>;
	remoteVideoRef: RefObject<HTMLVideoElement | null>;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	streamReady: boolean;
	connectionState: RTCConnectionState;
	reconnectStream: () => Promise<void>;
}

interface MediaDevicesConfig {
	video: {
		width: { ideal: number };
		height: { ideal: number };
		facingMode: string;
	};
	audio: {
		echoCancellation: boolean;
		noiseSuppression: boolean;
	};
}

export function useWebRTC(
	roomId: string,
	isParticipant: boolean = false
): UseWebRTCReturn {
	// Refs for video elements
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	// State
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [streamReady, setStreamReady] = useState<boolean>(false);
	const [connectionState, setConnectionState] = useState<RTCConnectionState>('new');

	// Refs to prevent loops
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const isInitializedRef = useRef<boolean>(false);
	const isConnectingRef = useRef<boolean>(false);

	const { socket } = useSocket();

	// STABLE: Create peer connection only once
	const createPeerConnection = useCallback((): RTCPeerConnection => {
		if (peerConnectionRef.current) {
			console.log('♻️ Reusing existing peer connection');
			return peerConnectionRef.current;
		}

		console.log('🔗 Creating new peer connection');
		const pc = new RTCPeerConnection({
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' },
				{ urls: 'stun:stun1.l.google.com:19302' }
			]
		});

		// Connection state monitoring
		pc.onconnectionstatechange = (): void => {
			console.log('🔗 Connection state:', pc.connectionState);
			setConnectionState(pc.connectionState as RTCConnectionState);
		};

		// ICE candidate handling
		pc.onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
			if (event.candidate && socket) {
				console.log('🧊 Sending ICE candidate');
				socket.emit('ice-candidate', {
					candidate: event.candidate,
					roomId
				});
			}
		};

		// Remote stream handling
		pc.ontrack = (event: RTCTrackEvent): void => {
			console.log('📡 Received remote track:', event.track.kind);
			const [stream] = event.streams;
			setRemoteStream(stream);

			if (remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = stream;
			}
		};

		peerConnectionRef.current = pc;
		return pc;
	}, [socket, roomId]);

	// STABLE: Initialize local stream only once
	const initializeLocalStream = useCallback(async (): Promise<MediaStream | null> => {
		if (localStream || !isParticipant) {
			console.log('🎥 Local stream already exists or not participant');
			return localStream;
		}

		try {
			console.log('🎥 Getting user media...');

			const mediaConfig: MediaStreamConstraints = {
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
					facingMode: 'user'
				},
				audio: {
					echoCancellation: true,
					noiseSuppression: true
				}
			};

			const stream: MediaStream = await navigator.mediaDevices.getUserMedia(mediaConfig);

			console.log('✅ Local stream acquired:', stream.id);
			setLocalStream(stream);
			setStreamReady(true);

			// Assign to video element
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}

			return stream;
		} catch (error) {
			console.error('❌ Failed to get user media:', error);
			throw error;
		}
	}, [localStream, isParticipant]);

	// STABLE: Handle WebRTC signaling
	useEffect(() => {
		if (!socket || !roomId || !isParticipant || isInitializedRef.current) {
			return;
		}

		console.log('🚀 Initializing WebRTC for room:', roomId);
		isInitializedRef.current = true;

		const cleanup: (() => void)[] = [];

		const handleOffer = async (data: WebRTCOffer): Promise<void> => {
			if (isConnectingRef.current) {
				console.log('⏸️ Already connecting, ignoring offer');
				return;
			}

			console.log('📨 Received offer from:', data.from);
			isConnectingRef.current = true;

			try {
				const pc: RTCPeerConnection = createPeerConnection();
				const stream: MediaStream | null = await initializeLocalStream();

				// Add local tracks to peer connection
				if (stream) {
					stream.getTracks().forEach((track: MediaStreamTrack) => {
						console.log('➕ Adding track to peer connection:', track.kind);
						pc.addTrack(track, stream);
					});
				}

				await pc.setRemoteDescription(data.offer);
				const answer: RTCSessionDescriptionInit = await pc.createAnswer();
				await pc.setLocalDescription(answer);

				socket.emit('answer', {
					answer,
					roomId,
					to: data.from
				});

				console.log('📤 Sent answer');
			} catch (error) {
				console.error('❌ Error handling offer:', error);
				isConnectingRef.current = false;
			}
		};

		const handleAnswer = async (data: WebRTCAnswer): Promise<void> => {
			console.log('📨 Received answer from:', data.from);
			try {
				const pc: RTCPeerConnection | null = peerConnectionRef.current;
				if (pc && pc.remoteDescription === null) {
					await pc.setRemoteDescription(data.answer);
					console.log('✅ Set remote description from answer');
				}
				isConnectingRef.current = false;
			} catch (error) {
				console.error('❌ Error handling answer:', error);
				isConnectingRef.current = false;
			}
		};

		const handleIceCandidate = async (data: WebRTCIceCandidate): Promise<void> => {
			console.log('🧊 Received ICE candidate from:', data.from);
			try {
				const pc: RTCPeerConnection | null = peerConnectionRef.current;
				if (pc && pc.remoteDescription) {
					await pc.addIceCandidate(data.candidate);
					console.log('✅ Added ICE candidate');
				} else {
					console.log('⏸️ Queuing ICE candidate for later');
				}
			} catch (error) {
				console.error('❌ Error adding ICE candidate:', error);
			}
		};

		const handleUserJoined = async (data: WebRTCUserJoined): Promise<void> => {
			if (isConnectingRef.current) {
				console.log('⏸️ Already connecting, ignoring user joined');
				return;
			}

			console.log('👋 User joined, initiating connection to:', data.userId);
			isConnectingRef.current = true;

			try {
				const pc: RTCPeerConnection = createPeerConnection();
				const stream: MediaStream | null = await initializeLocalStream();

				// Add local tracks
				if (stream) {
					stream.getTracks().forEach((track: MediaStreamTrack) => {
						console.log('➕ Adding track for new user:', track.kind);
						pc.addTrack(track, stream);
					});
				}

				const offer: RTCSessionDescriptionInit = await pc.createOffer();
				await pc.setLocalDescription(offer);

				socket.emit('offer', {
					offer,
					roomId,
					to: data.userId
				});

				console.log('📤 Sent offer to new user');
			} catch (error) {
				console.error('❌ Error creating offer:', error);
				isConnectingRef.current = false;
			}
		};

		// Set up socket listeners
		socket.on('offer', handleOffer);
		socket.on('answer', handleAnswer);
		socket.on('ice-candidate', handleIceCandidate);
		socket.on('user-joined', handleUserJoined);

		cleanup.push(() => {
			socket.off('offer', handleOffer);
			socket.off('answer', handleAnswer);
			socket.off('ice-candidate', handleIceCandidate);
			socket.off('user-joined', handleUserJoined);
		});

		// Initialize local stream immediately
		if (isParticipant) {
			initializeLocalStream().catch(console.error);
		}

		return () => {
			console.log('🧹 Cleaning up WebRTC');
			cleanup.forEach((fn: () => void) => fn());
			isConnectingRef.current = false;
		};
	}, [socket, roomId, isParticipant, createPeerConnection, initializeLocalStream]);

	// STABLE: Reconnect function
	const reconnectStream = useCallback(async (): Promise<void> => {
		console.log('🔄 Reconnecting streams...');

		try {
			// Stop existing streams
			if (localStream) {
				localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
				setLocalStream(null);
			}

			// Close peer connection
			if (peerConnectionRef.current) {
				peerConnectionRef.current.close();
				peerConnectionRef.current = null;
			}

			// Reset states
			setRemoteStream(null);
			setStreamReady(false);
			isConnectingRef.current = false;

			// Wait a bit
			await new Promise<void>((resolve) => setTimeout(resolve, 1000));

			// Reinitialize
			if (isParticipant) {
				await initializeLocalStream();
			}
		} catch (error) {
			console.error('❌ Reconnect failed:', error);
		}
	}, [localStream, isParticipant, initializeLocalStream]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			console.log('🧹 Component unmounting, cleaning up streams');

			if (localStream) {
				localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
			}

			if (peerConnectionRef.current) {
				peerConnectionRef.current.close();
			}
		};
	}, [localStream]);

	return {
		localVideoRef,
		remoteVideoRef,
		localStream,
		remoteStream,
		streamReady,
		connectionState,
		reconnectStream
	};
}

// Export types for use in other components
export type {
	MediaDevicesConfig, RTCConnectionState,
	UseWebRTCReturn, WebRTCAnswer,
	WebRTCIceCandidate, WebRTCOffer, WebRTCUserJoined
};
