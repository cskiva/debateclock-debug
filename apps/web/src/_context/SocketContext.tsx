// contexts/SocketContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export interface SocketUser {
  id: string;
  name: string;
  position: "for" | "against";
  isReady: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  users: SocketUser[];
  isConnected: boolean;
  joinRoom: (
    roomId: string,
    calledFrom: string,
    userData: Omit<SocketUser, "id" | "isReady">
  ) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  currentRoom: string | null;
  turnSpeaker: "for" | "against";
  passTurn: () => void;
  setUsers: React.Dispatch<React.SetStateAction<SocketUser[]>>;
  setCurrentRoom: React.Dispatch<React.SetStateAction<string | null>>;
  generatedRoomId: string;
  generatedUserId: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<SocketUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [turnSpeaker, setTurnSpeaker] = useState<"for" | "against">("for");

  // UUIDs generated once on initial load
  const [generatedRoomId] = useState<string>(() => uuidv4());
  const [generatedUserId] = useState<string>(() => uuidv4());

  useEffect(() => {
    const socketInstance = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
      { transports: ["websocket", "polling"] }
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", async () => {
      console.log("❌ Disconnected from server");
      setIsConnected(false);
      setUsers([]);
      setCurrentRoom(null);

      const socketId = socketInstance.id;
      await supabase
        .from("participants")
        .update({ peer_connection_status: "disconnected" })
        .eq("socket_id", socketId);
    });

    socketInstance.on(
      "room-joined",
      (data: { roomId: string; users: SocketUser[] }) => {
        setCurrentRoom(data.roomId);
        setUsers(data.users);
      }
    );

    socketInstance.on("user-joined", (user: SocketUser) => {
      setUsers((prev) => [...prev, user]);
    });

    socketInstance.on("user-left", (userId: string) => {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    });

    socketInstance.on("turn-passed", (newSpeaker: "for" | "against") => {
      setTurnSpeaker(newSpeaker);
    });

    socketInstance.on(
      "user-ready-changed",
      (data: { userId: string; isReady: boolean }) => {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === data.userId ? { ...user, isReady: data.isReady } : user
          )
        );
      }
    );

    socketInstance.on("room-error", (error: string) => {
      console.error("⚠️ Room error:", error);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = async (
    roomId: string,
    calledFrom: string,
    userData: Omit<SocketUser, "id" | "isReady">
  ) => {
    if (socket) {
      console.log("joinRoom Called from___", calledFrom);
      socket.emit("join-room", { roomId, userData });

      const { error } = await supabase.from("participants").insert({
        room_id: roomId,
        name: userData.name,
        position: userData.position,
        socket_id: socket.id,
        peer_connection_status: "connected",
        ice_candidates: [],
        is_ready: false,
      });

      if (error) {
        console.error("❌ Failed to log participant in Supabase:", error);
      } else {
        console.log("📥 Participant logged to Supabase");
      }
    }
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit("leave-room", currentRoom);
      setCurrentRoom(null);
      setUsers([]);
    }
  };

  const setReady = (ready: boolean) => {
    if (socket && currentRoom) {
      socket.emit("set-ready", { roomId: currentRoom, isReady: ready });
    }
  };

  const passTurn = () => {
    if (socket && currentRoom) {
      const newSpeaker = turnSpeaker === "for" ? "against" : "for";
      setTurnSpeaker(newSpeaker);
      socket.emit("pass-turn", { roomId: currentRoom, speaker: newSpeaker });
    }
  };

  const value: SocketContextType = {
    socket,
    users,
    isConnected,
    joinRoom,
    leaveRoom,
    setReady,
    currentRoom,
    turnSpeaker,
    passTurn,
    setUsers,
    setCurrentRoom,
    generatedRoomId,
    generatedUserId,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
