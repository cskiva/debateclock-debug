import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import express from "express";
import http from "http";
dotenv.config(); // Must be first!

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY! // NOT the anon key
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
	console.log("User connected:", socket.id);

	socket.on("join-room", async ({ roomId, userData }: { roomId: string; userData: Omit<SocketUser, "id" | "isReady"> }) => {
		socket.join(roomId);

		const user: SocketUser = {
			id: socket.id,
			...userData,
			isReady: false,
		};

		// ✅ Update participant record in Supabase
		const { error } = await supabase
			.from("participants")
			.update({
				name: user.name,
				position: user.position,
				room_id: roomId,
				created_at: new Date().toISOString(),
			})
			.eq("socket_id", socket.id);

		if (error) {
			console.error("❌ Failed to update participant info:", error);
		} else {
			console.log(`📦 Supabase updated for user ${user.name} (${socket.id})`);
		}

		if (!rooms[roomId]) rooms[roomId] = [];

		// Check if this name+position is already in the room
		const existingIndex = rooms[roomId].findIndex(
			(u) => u.name === user.name && u.position === user.position
		);

		if (existingIndex >= 0) {
			// User is rejoining (likely refreshed)
			rooms[roomId][existingIndex].id = socket.id;
		} else {
			// If the position is already taken, reject
			const positionTaken = rooms[roomId].some((u) => u.position === user.position);
			if (positionTaken) {
				socket.emit("room-full");
				console.log("room is full", rooms[roomId])
				return;
			}
			rooms[roomId].push(user);
		}

		// Broadcast new state to everyone in the room
		io.to(roomId).emit("room-joined", { roomId, users: rooms[roomId] });
		socket.to(roomId).emit("user-joined", user);

		// Setup readiness listener
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

		socket.on("leave-room", (roomId: string) => {
			socket.leave(roomId);
			rooms[roomId] = rooms[roomId]?.filter((u) => u.id !== socket.id);
			io.to(roomId).emit("user-left", socket.id);
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

		socket.on("disconnect", () => {
			for (const room in rooms) {
				rooms[room] = rooms[room].filter((u) => u.id !== socket.id);
				io.to(room).emit("user-left", socket.id);
				if (rooms[room].length === 0) delete rooms[room]; // optional cleanup
			}
		});
	});


});

app.get("/health", (_, res) => res.send("OK"));

const PORT = 3001;
server.listen(PORT, () => {
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
