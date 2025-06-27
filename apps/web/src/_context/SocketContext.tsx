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

  useEffect(() => {
    // Replace with your actual socket server URL
    const socketInstance = io(
      import.meta.env.REACT_APP_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket", "polling"],
      }
    );

    setSocket(socketInstance);

    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      setUsers([]);
      setCurrentRoom(null);
    });

    // Room event handlers
    socketInstance.on(
      "room-joined",
      (data: { roomId: string; users: SocketUser[] }) => {
        // console.log("Joined room:", data.roomId);
        setCurrentRoom(data.roomId);
        setUsers(data.users);
      }
    );

    socketInstance.on("user-joined", (user: SocketUser) => {
      console.log("User joined:", user);
      setUsers((prev) => [...prev, user]);
    });

    socketInstance.on("user-left", (userId: string) => {
      console.log("User left:", userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    });

    socketInstance.on(
      "user-ready-changed",
      (data: { userId: string; isReady: boolean }) => {
        console.log("User ready status changed:", data);
        setUsers((prev) =>
          prev.map((user) =>
            user.id === data.userId ? { ...user, isReady: data.isReady } : user
          )
        );
      }
    );

    socketInstance.on("room-error", (error: string) => {
      console.error("Room error:", error);
    });

    // Cleanup on unmount
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

  const value: SocketContextType = {
    socket,
    users,
    isConnected,
    joinRoom,
    leaveRoom,
    setReady,
    currentRoom,
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
