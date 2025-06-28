// server.ts
import { Server } from "socket.io";
import cors from "cors";
import express from "express";
import http from "http";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

type SocketUser = {
	id: string;
	name: string;
	position: "for" | "against";
	isReady: boolean;
};

const rooms: Record<string, SocketUser[]> = {};

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	socket.on("join-room", ({ roomId, userData }: { roomId: string; userData: Omit<SocketUser, "id" | "isReady"> }) => {
		socket.join(roomId);

		if (!rooms[roomId]) rooms[roomId] = [];

		let existing = rooms[roomId].find(
			(u) => u.name === userData.name && u.position === userData.position
		);

		if (existing) {
			existing.id = socket.id; // Update ID on reconnect
		} else {
			const newUser: SocketUser = {
				id: socket.id,
				...userData,
				isReady: false,
			};
			rooms[roomId].push(newUser);
		}

		io.to(roomId).emit("room-joined", { roomId, users: rooms[roomId] });
		socket.to(roomId).emit("user-joined", existing || userData);

		// Ready state updates
		socket.on("set-ready", ({ roomId, isReady }: { roomId: string; isReady: boolean }) => {
			const user = rooms[roomId]?.find((u) => u.id === socket.id);
			if (user) {
				user.isReady = isReady;
				io.to(roomId).emit("user-ready-changed", {
					userId: socket.id,
					isReady,
				});
			}
		});

		// Leave logic
		socket.on("leave-room", (roomId: string) => {
			socket.leave(roomId);
			rooms[roomId] = rooms[roomId]?.filter((u) => u.id !== socket.id);
			io.to(roomId).emit("user-left", socket.id);
		});

		// WebRTC relays
		socket.on("ready", ({ roomId }) => {
			socket.to(roomId).emit("ready");
		});
		socket.on("offer", ({ sdp, roomId }) => {
			socket.to(roomId).emit("offer", { sdp });
		});
		socket.on("answer", ({ sdp, roomId }) => {
			socket.to(roomId).emit("answer", { sdp });
		});
		socket.on("ice-candidate", ({ candidate, roomId }) => {
			socket.to(roomId).emit("ice-candidate", { candidate });
		});
		// Add these event handlers to your existing server socket.io code

		// WebRTC signaling events
		socket.on('offer', (data) => {
			console.log('Relaying offer to room:', data.roomId);
			socket.to(data.roomId).emit('offer', {
				offer: data.offer,
				from: socket.id
			});
		});

		socket.on('answer', (data) => {
			console.log('Relaying answer to:', data.to);
			socket.to(data.to).emit('answer', {
				answer: data.answer,
				from: socket.id
			});
		});

		socket.on('ice-candidate', (data) => {
			console.log('Relaying ICE candidate to room:', data.roomId);
			socket.to(data.roomId).emit('ice-candidate', {
				candidate: data.candidate,
				from: socket.id
			});
		});

		// Stream health monitoring events
		socket.on('request-reconnect', (data) => {
			console.log('Relaying reconnect request to room:', data.roomId);
			socket.to(data.roomId).emit('request-reconnect');
		});

		socket.on('request-stream-refresh', (data) => {
			console.log('Relaying stream refresh request to room:', data.roomId);
			socket.to(data.roomId).emit('request-stream-refresh');
		});

		// Enhanced join-room event to trigger WebRTC connection
		socket.on('join-room', (data) => {
			const { roomId, userData } = data;

			// Existing join room logic...
			socket.join(roomId);

			// Get current users in room
			const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
				.map(socketId => io.sockets.sockets.get(socketId))
				.filter(Boolean);

			// If this is the second user, notify about WebRTC connection
			if (usersInRoom.length === 2) {
				console.log('Two users in room, initiating WebRTC connection');
				socket.to(roomId).emit('user-joined', userData);
			}

			// Emit to all users in room
			io.to(roomId).emit('room-joined', {
				roomId,
				users: usersInRoom.map((s: SocketUser) => ({
					id: s.id,
					name: s.data?.name || 'Unknown',
					position: s.data?.position || 'for',
					isReady: s.data?.isReady || false
				}))
			});
		});

		// Turn passing
		socket.on("pass-turn", ({ roomId, speaker }) => {
			io.to(roomId).emit("turn-passed", speaker);
		});

		// Disconnect cleanup
		socket.on("disconnect", () => {
			for (const room in rooms) {
				const idx = rooms[room].findIndex((u) => u.id === socket.id);
				if (idx !== -1) {
					rooms[room].splice(idx, 1);
					io.to(room).emit("user-left", socket.id);
				}
			}
		});
	});
});

// Health check
app.get("/health", (_, res) => res.send("OK"));

// Start server
const PORT = 3001;
server.listen(PORT, () => {
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
