// hooks/useWebRTC.ts
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSocket } from '../_context/SocketContext';

interface UseWebRTCReturn {
	localVideoRef: React.RefObject<HTMLVideoElement>;
	remoteVideoRef: React.RefObject<HTMLVideoElement>;
	streamReady: boolean;
	setStreamReady: (ready: boolean) => void;
	reconnectStream: () => void;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
}

export function useWebRTC(roomId: string, autoStart: boolean = false): UseWebRTCReturn {
	const { socket } = useSocket();
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);
	const remoteStreamRef = useRef<MediaStream | null>(null);

	const [streamReady, setStreamReady] = useState(false);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

	// ICE servers configuration
	const iceServers = [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' },
	];

	// Monitor stream health
	const monitorStreamHealth = useCallback((stream: MediaStream, isLocal: boolean) => {
		if (!stream) return;

		const tracks = stream.getTracks();
		tracks.forEach(track => {
			track.addEventListener('ended', () => {
				console.warn(`${isLocal ? 'Local' : 'Remote'} track ended:`, track.kind);
				if (isLocal) {
					// Restart local stream
					getLocalStream();
				} else {
					// Request stream refresh from remote peer
					if (socket) {
						socket.emit('request-stream-refresh', { roomId });
					}
				}
			});

			track.addEventListener('mute', () => {
				console.warn(`${isLocal ? 'Local' : 'Remote'} track muted:`, track.kind);
			});

			track.addEventListener('unmute', () => {
				console.log(`${isLocal ? 'Local' : 'Remote'} track unmuted:`, track.kind);
			});
		});
	}, [socket, roomId]);

	// Get local media stream
	const getLocalStream = useCallback(async () => {
		try {
			console.log('Getting local stream...');
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
					frameRate: { ideal: 30 }
				},
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			localStreamRef.current = stream;
			setLocalStream(stream);

			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
			}

			// Monitor local stream health
			monitorStreamHealth(stream, true);

			setStreamReady(true);
			console.log('Local stream ready:', stream.getTracks().map(t => `${t.kind}: ${t.readyState}`));
			return stream;
		} catch (error) {
			console.error('Error getting local stream:', error);
			setStreamReady(false);
			return null;
		}
	}, [monitorStreamHealth]);

	// Create peer connection
	const createPeerConnection = useCallback(() => {
		console.log('Creating peer connection...');
		const pc = new RTCPeerConnection({ iceServers });

		// Handle remote stream
		pc.ontrack = (event) => {
			console.log('Received remote track:', event.track.kind);
			const [remoteStream] = event.streams;

			if (remoteStream) {
				remoteStreamRef.current = remoteStream;
				setRemoteStream(remoteStream);

				if (remoteVideoRef.current) {
					remoteVideoRef.current.srcObject = remoteStream;
				}

				// Monitor remote stream health
				monitorStreamHealth(remoteStream, false);
			}
		};

		// Handle ICE candidates
		pc.onicecandidate = (event) => {
			if (event.candidate && socket) {
				console.log('Sending ICE candidate');
				socket.emit('ice-candidate', {
					roomId,
					candidate: event.candidate
				});
			}
		};

		// Monitor connection state
		pc.onconnectionstatechange = () => {
			console.log('Connection state:', pc.connectionState);

			if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
				console.warn('Peer connection failed/disconnected, attempting reconnect...');
				setTimeout(reconnectStream, 2000);
			}
		};

		// Monitor ICE connection state
		pc.oniceconnectionstatechange = () => {
			console.log('ICE connection state:', pc.iceConnectionState);

			if (pc.iceConnectionState === 'failed') {
				console.warn('ICE connection failed, restarting...');
				pc.restartIce();
			}
		};

		peerConnectionRef.current = pc;
		return pc;
	}, [socket, roomId, monitorStreamHealth]);

	// Reconnect stream function
	const reconnectStream = useCallback(async () => {
		console.log('Reconnecting stream...');

		// Clean up existing connection
		if (peerConnectionRef.current) {
			peerConnectionRef.current.close();
		}

		// Get fresh local stream
		const stream = await getLocalStream();
		if (!stream) return;

		// Create new peer connection
		const pc = createPeerConnection();

		// Add local stream tracks
		stream.getTracks().forEach(track => {
			pc.addTrack(track, stream);
		});

		// Notify other peer to reconnect
		if (socket) {
			socket.emit('request-reconnect', { roomId });
		}
	}, [getLocalStream, createPeerConnection, socket, roomId]);

	// Initialize WebRTC
	useEffect(() => {
		if (!socket || !autoStart) return;

		getLocalStream();

		// Socket event handlers
		const handleOffer = async (data: { offer: RTCSessionDescriptionInit, from: string }) => {
			console.log('Received offer from:', data.from);

			if (!localStreamRef.current) {
				await getLocalStream();
			}

			const pc = createPeerConnection();

			// Add local stream tracks
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => {
					pc.addTrack(track, localStreamRef.current!);
				});
			}

			await pc.setRemoteDescription(data.offer);
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			socket.emit('answer', {
				roomId,
				answer,
				to: data.from
			});
		};

		const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
			console.log('Received answer');
			if (peerConnectionRef.current) {
				await peerConnectionRef.current.setRemoteDescription(data.answer);
			}
		};

		const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
			console.log('Received ICE candidate');
			if (peerConnectionRef.current) {
				await peerConnectionRef.current.addIceCandidate(data.candidate);
			}
		};

		const handleUserJoined = async () => {
			console.log('User joined, initiating call...');

			if (!localStreamRef.current) {
				await getLocalStream();
			}

			const pc = createPeerConnection();

			// Add local stream tracks
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => {
					pc.addTrack(track, localStreamRef.current!);
				});
			}

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			socket.emit('offer', {
				roomId,
				offer
			});
		};

		const handleRequestReconnect = () => {
			console.log('Received reconnect request');
			reconnectStream();
		};

		const handleRequestStreamRefresh = async () => {
			console.log('Received stream refresh request');
			await getLocalStream();
		};

		// Register socket event listeners
		socket.on('offer', handleOffer);
		socket.on('answer', handleAnswer);
		socket.on('ice-candidate', handleIceCandidate);
		socket.on('user-joined', handleUserJoined);
		socket.on('request-reconnect', handleRequestReconnect);
		socket.on('request-stream-refresh', handleRequestStreamRefresh);

		return () => {
			// Cleanup socket listeners
			socket.off('offer', handleOffer);
			socket.off('answer', handleAnswer);
			socket.off('ice-candidate', handleIceCandidate);
			socket.off('user-joined', handleUserJoined);
			socket.off('request-reconnect', handleRequestReconnect);
			socket.off('request-stream-refresh', handleRequestStreamRefresh);

			// Close peer connection
			if (peerConnectionRef.current) {
				peerConnectionRef.current.close();
			}

			// Stop local stream
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(track => track.stop());
			}
		};
	}, [socket, autoStart, roomId, getLocalStream, createPeerConnection, reconnectStream]);

	// Video element health monitoring
	useEffect(() => {
		const localVideo = localVideoRef.current;
		const remoteVideo = remoteVideoRef.current;

		if (localVideo) {
			const handleLocalVideoError = () => {
				console.error('Local video error, restarting stream...');
				getLocalStream();
			};

			localVideo.addEventListener('error', handleLocalVideoError);
			return () => localVideo.removeEventListener('error', handleLocalVideoError);
		}

		if (remoteVideo) {
			const handleRemoteVideoError = () => {
				console.error('Remote video error, requesting refresh...');
				if (socket) {
					socket.emit('request-stream-refresh', { roomId });
				}
			};

			remoteVideo.addEventListener('error', handleRemoteVideoError);
			return () => remoteVideo.removeEventListener('error', handleRemoteVideoError);
		}
	}, [getLocalStream, socket, roomId]);

	return {
		localVideoRef,
		remoteVideoRef,
		streamReady,
		setStreamReady,
		reconnectStream,
		localStream,
		remoteStream
	};
}