// server.ts
import { Server, Socket } from "socket.io";

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

	socket.on('join-room', (data) => {
		const { roomId, userData } = data;

		console.log('🚪 JOIN REQUEST:', {
			socketId: socket.id.slice(-4),
			roomId,
			userData: userData.name,
			currentUsers: rooms[roomId] ? rooms[roomId].length : 0
		});

		if (!rooms[roomId]) {
			console.log("clearing room")
			rooms[roomId] = [];
		}

		// Check if user exists by EITHER socket ID OR name
		const existingBySocket = rooms[roomId].findIndex(u => u.id === socket.id);
		const existingByName = rooms[roomId].findIndex(u => u.name === userData.name);

		if (existingBySocket !== -1) {
			// Update existing user by socket ID
			rooms[roomId][existingBySocket] = { id: socket.id, ...userData };
			console.log('♻️ Updated user by socket ID:', userData.name);
		} else if (existingByName !== -1) {
			// Update existing user by name (probably a refresh)
			rooms[roomId][existingByName] = { id: socket.id, ...userData };
			console.log('♻️ Updated user by name (refresh):', userData.name);
			socket.join(roomId);
		} else {
			// Truly new user
			rooms[roomId].push({ id: socket.id, ...userData });
			console.log('➕ Added new user:', userData.name);
			socket.join(roomId);
			socket.to(roomId).emit('user-joined', { userId: socket.id });
		}

		// Send updated room state
		io.to(roomId).emit('room-users', {
			users: rooms[roomId],
			roomUsers: rooms
		});

		console.log('✅ Room users:', rooms[roomId].map(u => `${u.name}(${u.id.slice(-4)})`));
	});
});

// Health check
app.get("/health", (_, res) => res.send("OK"));

// Start server
const PORT = 3001;
server.listen(PORT, () => {
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
