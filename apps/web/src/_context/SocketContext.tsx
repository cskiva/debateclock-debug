// contexts/SocketContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

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
    userData: Omit<SocketUser, "id" | "isReady">
  ) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  currentRoom: string | null;
  turnSpeaker: "for" | "against";
  passTurn: () => void;
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

  useEffect(() => {
    const socketInstance = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
      }
    );

    setSocket(socketInstance);

    // --- Connection events
    socketInstance.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setIsConnected(false);
      setUsers([]);
      setCurrentRoom(null);
    });

    // --- Room management
    socketInstance.on(
      "room-joined",
      (data: { roomId: string; users: SocketUser[] }) => {
        setCurrentRoom(data.roomId);
        setUsers(data.users);
      }
    );

    socketInstance.on("user-joined", (user: SocketUser) => {
      console.log("👤 User joined:", user);
      setUsers((prev) => [...prev, user]);
    });

    socketInstance.on("user-left", (userId: string) => {
      console.log("🚪 User left:", userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    });

    // --- Turn management
    socketInstance.on("turn-passed", (newSpeaker: "for" | "against") => {
      console.log("🔁 Turn passed to:", newSpeaker);
      setTurnSpeaker(newSpeaker);
    });

    // --- Readiness tracking
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

    // --- Error handling
    socketInstance.on("room-error", (error: string) => {
      console.error("⚠️ Room error:", error);
    });

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (
    roomId: string,
    userData: Omit<SocketUser, "id" | "isReady">
  ) => {
    if (socket) {
      socket.emit("join-room", {
        roomId,
        userData,
      });
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
      socket.emit("set-ready", {
        roomId: currentRoom,
        isReady: ready,
      });
    }
  };

  const passTurn = () => {
    if (socket && currentRoom) {
      const newSpeaker = turnSpeaker === "for" ? "against" : "for";
      setTurnSpeaker(newSpeaker); // optimistic update
      socket.emit("pass-turn", {
        roomId: currentRoom,
        speaker: newSpeaker,
      });
    } else {
      console.log("⚠️ passTurn: conditions not met");
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
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
