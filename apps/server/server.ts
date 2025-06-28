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

		const user: SocketUser = {
			id: socket.id,
			...userData,
			isReady: false,
		};

		if (!rooms[roomId]) rooms[roomId] = [];
		if (!rooms[roomId]) rooms[roomId] = [];

		const alreadyExists = rooms[roomId].some(
			(u) => u.name === user.name && u.position === user.position
		);

		if (!alreadyExists) {
			rooms[roomId].push(user);
		}

		io.to(roomId).emit("room-joined", { roomId, users: rooms[roomId] });
		socket.to(roomId).emit("user-joined", user);

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

app.get("/health", (_, res) => res.send("OK"));

const PORT = 3001;
server.listen(PORT, () => {
	console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
