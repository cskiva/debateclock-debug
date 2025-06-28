import { Server } from 'socket.io';
import cors from 'cors';
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: ["http://localhost:5173", "http://localhost:3000"],
		methods: ["GET", "POST"]
	}
});

app.use(cors());
app.use(express.json());

// Room storage - in production, use Redis or database
const rooms: { [roomId: string]: any[] } = {};

// Socket connection handling
io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	// Handle room joining
	socket.on('join-room', (data) => {
		const { roomId, userData } = data;

		console.log('🚪 JOIN REQUEST:', {
			socketId: socket.id.slice(-4),
			roomId,
			userName: userData.name,
			position: userData.position,
			currentRoomSize: rooms[roomId] ? rooms[roomId].length : 0
		});

		// Initialize room if it doesn't exist
		if (!rooms[roomId]) {
			rooms[roomId] = [];
			console.log('📝 Created new room:', roomId);
		}

		// Check for existing user by socket ID OR name (handles refreshes)
		const existingBySocket = rooms[roomId].findIndex(u => u.id === socket.id);
		const existingByName = rooms[roomId].findIndex(u => u.name === userData.name);

		if (existingBySocket !== -1) {
			// Update existing user by socket ID
			rooms[roomId][existingBySocket] = { id: socket.id, ...userData };
			console.log('♻️ Updated existing user by socket:', userData.name);
		} else if (existingByName !== -1) {
			// User refreshed - update their socket ID but keep same spot
			console.log('🔄 User reconnected after refresh:', userData.name);
			rooms[roomId][existingByName] = { id: socket.id, ...userData };
			socket.join(roomId);
		} else {
			// Truly new user - add them
			const newUser = { id: socket.id, ...userData };
			rooms[roomId].push(newUser);
			console.log('➕ Added new user:', userData.name);

			socket.join(roomId);

			// Only notify others of new users (not updates/refreshes)
			socket.to(roomId).emit('user-joined', {
				userId: socket.id,
				userData: userData
			});
		}

		// Send current room state to ALL users in room
		const roomUsers = rooms[roomId];
		io.to(roomId).emit('room-users', {
			users: roomUsers,
			roomUsers: rooms
		});

		console.log('✅ Room state after join:', {
			roomId,
			userCount: roomUsers.length,
			users: roomUsers.map(u => `${u.name}(${u.id.slice(-4)})${u.isReady ? '✅' : '❌'}`)
		});
	});

	// Handle leaving room
	socket.on('leave-room', (data) => {
		const { roomId } = data;
		console.log(`🚪 LEAVE REQUEST: ${socket.id.slice(-4)} leaving ${roomId}`);

		if (rooms[roomId]) {
			const userIndex = rooms[roomId].findIndex(u => u.id === socket.id);
			if (userIndex !== -1) {
				const user = rooms[roomId][userIndex];
				rooms[roomId].splice(userIndex, 1);

				socket.leave(roomId);

				// Notify remaining users
				socket.to(roomId).emit("user-left", {
					userId: socket.id,
					userName: user.name
				});

				// Update room state
				io.to(roomId).emit('room-users', {
					users: rooms[roomId],
					roomUsers: rooms
				});

				console.log(`✅ ${user.name} left room ${roomId}`);

				// Clean up empty rooms
				if (rooms[roomId].length === 0) {
					console.log(`🗑️ Cleaning up empty room: ${roomId}`);
					delete rooms[roomId];
				}
			}
		}
	});

	// Handle ready state changes
	socket.on('set-ready', (data) => {
		const { roomId, isReady } = data;

		console.log('✅ SET READY REQUEST:', {
			socketId: socket.id.slice(-4),
			roomId,
			isReady
		});

		if (rooms[roomId]) {
			const userIndex = rooms[roomId].findIndex(u => u.id === socket.id);
			if (userIndex !== -1) {
				rooms[roomId][userIndex].isReady = isReady;

				// Broadcast updated room state
				io.to(roomId).emit('room-users', {
					users: rooms[roomId],
					roomUsers: rooms
				});

				console.log('✅ Updated ready state:', {
					user: rooms[roomId][userIndex].name,
					isReady,
					readyCount: rooms[roomId].filter(u => u.isReady).length,
					totalCount: rooms[roomId].length
				});
			}
		}
	});

	// Handle turn passing
	socket.on('pass-turn', (data) => {
		const { roomId } = data;
		console.log('🔄 Pass turn request:', { roomId, from: socket.id.slice(-4) });

		// Broadcast turn change to room
		socket.to(roomId).emit('turn-changed', {
			speaker: 'against', // Simple toggle - you can make this smarter
			roomId
		});
	});

	// WebRTC Signaling
	socket.on('offer', (data) => {
		console.log('📨 Relaying offer to room:', data.roomId);
		socket.to(data.roomId).emit('offer', {
			offer: data.offer,
			from: socket.id,
			roomId: data.roomId
		});
	});

	socket.on('answer', (data) => {
		console.log('📨 Relaying answer to room:', data.roomId);
		socket.to(data.roomId).emit('answer', {
			answer: data.answer,
			from: socket.id,
			roomId: data.roomId
		});
	});

	socket.on('ice-candidate', (data) => {
		console.log('🧊 Relaying ICE candidate to room:', data.roomId);
		socket.to(data.roomId).emit('ice-candidate', {
			candidate: data.candidate,
			from: socket.id,
			roomId: data.roomId
		});
	});

	// Handle disconnect
	socket.on("disconnect", () => {
		console.log('❌ User disconnecting:', socket.id.slice(-4));

		for (const roomId in rooms) {
			if (rooms[roomId] && Array.isArray(rooms[roomId])) {
				const userIndex = rooms[roomId].findIndex((u) => u.id === socket.id);
				if (userIndex !== -1) {
					const user = rooms[roomId][userIndex];
					console.log(`🚪 Removing ${user.name} from room ${roomId}`);

					rooms[roomId].splice(userIndex, 1);

					// Notify remaining users
					socket.to(roomId).emit("user-left", {
						userId: socket.id,
						userName: user.name
					});

					// Update room state for remaining users
					io.to(roomId).emit('room-users', {
						users: rooms[roomId],
						roomUsers: rooms
					});

					// Clean up empty rooms
					if (rooms[roomId].length === 0) {
						console.log(`🗑️ Cleaning up empty room: ${roomId}`);
						delete rooms[roomId];
					}

					break; // User can only be in one room
				}
			}
		}
	});
});

// API Routes (if you need them)
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', rooms: Object.keys(rooms).length });
});

app.get('/api/rooms', (req, res) => {
	const roomSummary = Object.keys(rooms).map(roomId => ({
		roomId,
		userCount: rooms[roomId].length,
		users: rooms[roomId].map(u => ({ name: u.name, position: u.position, ready: u.isReady }))
	}));
	res.json(roomSummary);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
	console.log(`🚀 Server running on port ${PORT}`);
	console.log(`📡 Socket.IO ready for connections`);
});