import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import express from "express";
import http from "http";
dotenv.config();

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
	console.log("✅ User connected:", socket.id);

	socket.on("join-room", async ({ roomId, userData }: { roomId: string; userData: Omit<SocketUser, "id" | "isReady"> }) => {
		console.log(`🚪 User ${userData.name} trying to join room ${roomId}`);

		socket.join(roomId);

		const user: SocketUser = {
			id: socket.id,
			...userData,
			isReady: false,
		};

		// ✅ Check if this is the host (created the debate)
		let isHost = false;
		try {
			const { data: debateData } = await supabase
				.from("debates")
				.select("host_name, host_position")
				.eq("room_id", roomId)
				.single();

			isHost = debateData &&
				debateData.host_name === userData.name &&
				debateData.host_position === userData.position;
		} catch (error) {
			console.log("Could not determine host status:", error);
		}

		// ✅ Upsert participant with new schema
		try {
			console.log(`💾 Upserting participant: ${userData.name} (${socket.id}) to room ${roomId}`);

			const { error } = await supabase
				.from("participants")
				.upsert({
					socket_id: socket.id,
					room_id: roomId,
					name: user.name,
					position: user.position,
					peer_connection_status: "connected",
					ice_candidates: [],
					is_ready: user.isReady,
					is_host: isHost,
					joined_at: new Date().toISOString(),
				}, {
					onConflict: 'socket_id'
				});

			if (error) {
				console.error("❌ Failed to upsert participant:", error);
			} else {
				console.log(`✅ Upserted participant ${user.name} (${socket.id}), host: ${isHost}`);
			}
		} catch (dbError) {
			console.error("💥 Database operation failed:", dbError);
		}

		// Initialize room if it doesn't exist
		if (!rooms[roomId]) {
			rooms[roomId] = [];
			console.log(`🏠 Created new room: ${roomId}`);
		}

		// Check if this name+position is already in the room (for reconnections)
		const existingIndex = rooms[roomId].findIndex(
			(u) => u.name === user.name && u.position === user.position
		);

		if (existingIndex >= 0) {
			// User is rejoining (likely refreshed) - update their socket ID
			console.log(`🔄 User ${user.name} rejoining room`);
			rooms[roomId][existingIndex].id = socket.id;
		} else {
			// Check if the position is already taken by someone else
			const positionTaken = rooms[roomId].some((u) => u.position === user.position);
			if (positionTaken) {
				console.log(`🚫 Position ${user.position} already taken in room ${roomId}`);
				socket.emit("room-full", { message: `Position ${user.position} is already taken` });
				return;
			}
			console.log(`➕ Adding new user ${user.name} to room ${roomId}`);
			rooms[roomId].push(user);
		}

		console.log(`📊 Room ${roomId} now has users:`, rooms[roomId].map(u => `${u.name}(${u.position})`));

		// Broadcast new state to everyone in the room
		io.to(roomId).emit("room-joined", {
			roomId,
			users: rooms[roomId],
			message: `${user.name} joined the debate`
		});

		// Notify others (not including the user who just joined)
		socket.to(roomId).emit("user-joined", user);

		// Send current room state to the joining user
		socket.emit("room-state", {
			roomId,
			users: rooms[roomId],
			yourId: socket.id
		});

		console.log(`✅ User ${user.name} successfully joined room ${roomId}`);
	});

	// Setup readiness listener
	socket.on("set-ready", async ({ roomId, isReady }: { roomId: string; isReady: boolean }) => {
		console.log(`🎯 User ${socket.id} setting ready to ${isReady} in room ${roomId}`);

		const user = rooms[roomId]?.find((u) => u.id === socket.id);
		if (user) {
			user.isReady = isReady;

			// Update in database
			try {
				const { error } = await supabase
					.from("participants")
					.update({
						is_ready: isReady,
						updated_at: new Date().toISOString()
					})
					.eq("socket_id", socket.id);

				if (error) {
					console.error("❌ Failed to update ready state in DB:", error);
				} else {
					console.log(`📝 Updated ready state in DB for ${socket.id}`);
				}
			} catch (dbError) {
				console.error("💥 DB ready update failed:", dbError);
			}

			io.to(roomId).emit("user-ready-changed", {
				userId: socket.id,
				isReady,
				userName: user.name
			});
			console.log(`📢 Broadcasted ready state change for ${user.name}`);
		} else {
			console.log(`❌ User ${socket.id} not found in room ${roomId}`);
		}
	});

	socket.on("leave-room", async (roomId: string) => {
		console.log(`🚪 User ${socket.id} leaving room ${roomId}`);
		socket.leave(roomId);

		// Update database
		try {
			await supabase
				.from("participants")
				.update({
					peer_connection_status: "disconnected",
					updated_at: new Date().toISOString()
				})
				.eq("socket_id", socket.id);
		} catch (error) {
			console.error("❌ Failed to update disconnect status:", error);
		}

		if (rooms[roomId]) {
			rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
			io.to(roomId).emit("user-left", socket.id);
			console.log(`📊 Room ${roomId} now has ${rooms[roomId].length} users`);
		}
	});

	socket.on("ready", ({ roomId }) => {
		socket.to(roomId).emit("ready");
	});

	socket.on("offer", ({ sdp, roomId }) => {
		socket.to(roomId).emit("offer", { sdp });
		console.log("📨 offer for...", roomId);
	});

	socket.on("answer", ({ sdp, roomId }) => {
		socket.to(roomId).emit("answer", { sdp });
		console.log("📨 answer for", roomId);
	});

	socket.on("ice-candidate", ({ candidate, roomId }) => {
		socket.to(roomId).emit("ice-candidate", { candidate });
		console.log("📨 candidate for", roomId);
	});

	socket.on("pass-turn", ({ roomId, speaker }) => {
		io.to(roomId).emit("turn-passed", speaker);
	});

	socket.on("disconnect", async () => {
		console.log(`🔌 User ${socket.id} disconnected`);

		// Update database
		try {
			await supabase
				.from("participants")
				.update({
					peer_connection_status: "disconnected",
					updated_at: new Date().toISOString()
				})
				.eq("socket_id", socket.id);
		} catch (error) {
			console.error("❌ Failed to update disconnect status:", error);
		}

		// Remove from rooms
		for (const roomId in rooms) {
			const originalLength = rooms[roomId].length;
			rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);

			if (rooms[roomId].length < originalLength) {
				console.log(`👋 Removed user ${socket.id} from room ${roomId}`);
				io.to(roomId).emit("user-left", socket.id);
			}

			if (rooms[roomId].length === 0) {
				delete rooms[roomId];
				console.log(`🗑️ Cleaned up empty room ${roomId}`);
			}
		}
	});
});

app.get("/health", (_, res) => {
	console.log("🏥 Health check requested");
	res.json({
		status: "OK",
		timestamp: new Date().toISOString(),
		rooms: Object.keys(rooms).length,
		totalUsers: Object.values(rooms).flat().length,
		roomDetails: Object.entries(rooms).map(([roomId, users]) => ({
			roomId,
			userCount: users.length,
			users: users.map(u => ({ name: u.name, position: u.position, ready: u.isReady }))
		}))
	});
});

// ✅ Updated debug endpoints for new schema
app.get("/participants/:roomId", async (req, res) => {
	try {
		const { roomId } = req.params;
		const { data, error } = await supabase
			.from("participants")
			.select(`
				id,
				socket_id,
				name,
				position,
				peer_connection_status,
				is_ready,
				is_host,
				joined_at,
				created_at
			`)
			.eq("room_id", roomId)
			.order("joined_at", { ascending: true });

		if (error) {
			res.status(500).json({ error: error.message });
		} else {
			res.json({
				roomId,
				participants: data,
				count: data?.length || 0
			});
		}
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
});

app.get("/debates/:roomId", async (req, res) => {
	try {
		const { roomId } = req.params;
		const { data, error } = await supabase
			.from("debates")
			.select(`
				id,
				room_id,
				topic,
				host_name,
				host_position,
				duration,
				status,
				created_at
			`)
			.eq("room_id", roomId)
			.single();

		if (error) {
			res.status(500).json({ error: error.message });
		} else {
			res.json(data);
		}
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
});

// ✅ Get debate with participants (using the view)
app.get("/debates/:roomId/full", async (req, res) => {
	try {
		const { roomId } = req.params;
		const { data: debate, error: debateError } = await supabase
			.from("debates_with_participants")
			.select("*")
			.eq("room_id", roomId)
			.single();

		if (debateError) {
			res.status(500).json({ error: debateError.message });
			return;
		}

		const { data: participants, error: participantsError } = await supabase
			.from("participants")
			.select("*")
			.eq("room_id", roomId)
			.eq("peer_connection_status", "connected")
			.order("joined_at", { ascending: true });

		if (participantsError) {
			res.status(500).json({ error: participantsError.message });
			return;
		}

		res.json({
			...debate,
			participants: participants || []
		});
	} catch (err: any) {
		res.status(500).json({ error: err.message });
	}
});

app.get("/rooms", (_, res) => {
	res.json({
		rooms,
		summary: Object.entries(rooms).map(([roomId, users]) => ({
			roomId,
			userCount: users.length,
			users: users.map(u => ({ name: u.name, position: u.position }))
		}))
	});
});

const PORT = 3001;

server.listen(PORT, () => {
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
	console.log(`🌐 Health check: http://localhost:${PORT}/health`);
	console.log(`🔍 Debug rooms: http://localhost:${PORT}/rooms`);
	console.log(`🔍 Debug participants: http://localhost:${PORT}/participants/:roomId`);
	console.log(`🔍 Debug debates: http://localhost:${PORT}/debates/:roomId`);
	console.log(`🔍 Debug full: http://localhost:${PORT}/debates/:roomId/full`);
});