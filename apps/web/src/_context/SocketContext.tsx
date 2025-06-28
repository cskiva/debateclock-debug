import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";

// Types for socket events and data structures
export interface SocketUser {
  id: string;
  name: string;
  position: "for" | "against";
  isReady?: boolean;
}

interface UserData {
  name: string;
  position: "for" | "against";
  isReady?: boolean;
}

interface RoomUsers {
  [roomId: string]: SocketUser[];
}

interface JoinRoomData {
  roomId: string;
  userData: UserData;
}

interface LeaveRoomData {
  roomId: string;
}

interface PassTurnData {
  roomId: string;
}

interface SetReadyData {
  roomId: string;
  isReady: boolean;
}

interface RoomUsersResponse {
  users: SocketUser[];
  roomUsers: RoomUsers;
}

interface UserJoinedResponse {
  user: SocketUser;
  roomId: string;
}

interface UserLeftResponse {
  userId: string;
  roomId: string;
}

interface TurnChangeResponse {
  speaker: "for" | "against";
  roomId: string;
}

// Socket context value type
interface SocketContextValue {
  socket: Socket | null;
  users: SocketUser[];
  turnSpeaker: "for" | "against";
  roomUsers: RoomUsers;
  currentRoom: string | null;
  currentUser: SocketUser | null;
  joinRoom: (roomId: string, userData: UserData) => void;
  leaveRoom: () => void;
  passTurn: () => void;
  setReady: (isReady: boolean) => void;
  isConnected: boolean;
}

// Socket provider props
interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<SocketUser[]>([]);
  const [turnSpeaker, setTurnSpeaker] = useState<"for" | "against">("for");
  const [roomUsers, setRoomUsers] = useState<RoomUsers>({});

  // ADD THESE FOR PERSISTENCE
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(
    () => {
      const saved = sessionStorage.getItem("currentUserData");
      return saved ? JSON.parse(saved) : null;
    }
  );

  // Prevent duplicate connections and infinite loops
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  const currentRoomRef = useRef<string | null>(
    sessionStorage.getItem("currentRoom")
  );

  // STABLE: Initialize socket connection only once
  useEffect(() => {
    if (socketRef.current && isConnectedRef.current) {
      console.log("♻️ Socket already connected, reusing");
      setSocket(socketRef.current);
      return;
    }

    console.log("🔌 Initializing socket connection");
    const newSocket: Socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:3001",
      {
        transports: ["websocket"],
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    // In your SocketContext useEffect where you create the socket
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      isConnectedRef.current = true;
      setSocket(newSocket);

      // AUTO-REJOIN IMMEDIATELY on connect
      const savedRoom = sessionStorage.getItem("currentRoom");
      const savedUserData = sessionStorage.getItem("currentUserData");

      console.log("🔄 Checking for auto-rejoin:", { savedRoom, savedUserData });

      if (savedRoom && savedUserData) {
        console.log("🚪 Auto-rejoining room after connect/refresh");
        const userData = JSON.parse(savedUserData);

        // Set current room reference immediately
        currentRoomRef.current = savedRoom;

        // Rejoin the room
        setTimeout(() => {
          console.log("📤 Emitting rejoin for:", { savedRoom, userData });
          newSocket.emit("join-room", {
            roomId: savedRoom,
            userData,
          });
        }, 100);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      isConnectedRef.current = false;
      setUsers([]);
      setRoomUsers({});
    });

    newSocket.on("error", (error: Error) => {
      console.error("❌ Socket error:", error);
    });

    socketRef.current = newSocket;

    return () => {
      console.log("🧹 Cleaning up socket");
      if (newSocket) {
        newSocket.disconnect();
      }
      isConnectedRef.current = false;
      socketRef.current = null;
    };
  }, []); // Empty dependency array - initialize only once

  const joinRoom = (roomId: string, userData: UserData): void => {
    if (!socket || !isConnectedRef.current) {
      console.error("❌ Cannot join room: socket not connected");
      return;
    }

    console.log("🚪 Joining room:", roomId, userData);

    // ✅ SET AND PERSIST CURRENT ROOM AND USER DATA
    currentRoomRef.current = roomId;
    setCurrentUserData(userData);
    sessionStorage.setItem("currentRoom", roomId);
    sessionStorage.setItem("currentUserData", JSON.stringify(userData));

    socket.emit("join-room", {
      roomId,
      userData,
    } as JoinRoomData);
  };

  // STABLE: Leave room function
  const leaveRoom = (): void => {
    if (!socket || !currentRoomRef.current) {
      return;
    }

    console.log("🚪 Leaving room:", currentRoomRef.current);
    socket.emit("leave-room", {
      roomId: currentRoomRef.current,
    } as LeaveRoomData);

    currentRoomRef.current = null;
    setUsers([]);
    setRoomUsers({});
  };

  // STABLE: Set up room event listeners with duplicate prevention
  useEffect(() => {
    if (!socket) return;

    let lastUserUpdate = 0;
    const UPDATE_THROTTLE = 500; // Throttle updates to prevent spam

    const handleRoomUsers = (data: RoomUsersResponse): void => {
      const now = Date.now();
      if (now - lastUserUpdate < UPDATE_THROTTLE) {
        console.log("⏸️ Throttling user update");
        return;
      }

      lastUserUpdate = now;
      console.log("👥 Room users updated:", data);

      setUsers(data.users || []);
      setRoomUsers(data.roomUsers || {});

      // ✅ ADD THIS LINE - update current room when we get room users
      if (data.users && data.users.length > 0) {
        // We're definitely in a room if we're getting user updates
        // currentRoomRef.current should already be set, but just in case:
        console.log("📍 Confirming current room is set");
      }

      // IMPORTANT: Only trigger WebRTC if we have exactly 2 users and haven't already started
      if (data.users && data.users.length === 2 && currentRoomRef.current) {
        console.log("👥 Two users in room, ready for WebRTC");
        // Don't emit anything here - let the WebRTC hook handle it
      }
    };

    const handleUserJoined = (data: UserJoinedResponse): void => {
      console.log("👋 User joined:", data);
      setUsers((prev: SocketUser[]) => {
        // Prevent duplicates
        const exists = prev.find(
          (user: SocketUser) => user.id === data.user.id
        );
        if (exists) {
          console.log("⏸️ User already in list, skipping");
          return prev;
        }
        return [...prev, data.user];
      });
    };

    const handleUserLeft = (data: UserLeftResponse): void => {
      console.log("👋 User left:", data);
      setUsers((prev: SocketUser[]) =>
        prev.filter((user: SocketUser) => user.id !== data.userId)
      );
    };

    const handleTurnChange = (data: TurnChangeResponse): void => {
      console.log("🔄 Turn changed to:", data.speaker);
      setTurnSpeaker(data.speaker);
    };

    // Set up listeners with proper typing
    socket.on("room-users", handleRoomUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("turn-changed", handleTurnChange);

    return () => {
      socket.off("room-users", handleRoomUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("turn-changed", handleTurnChange);
    };
  }, [socket]);

  // Turn management
  const passTurn = (): void => {
    if (!socket || !currentRoomRef.current) return;

    console.log("🔄 Passing turn");
    socket.emit("pass-turn", {
      roomId: currentRoomRef.current,
    } as PassTurnData);
  };

  // Ready state management
  const setReady = (isReady: boolean): void => {
    if (!socket || !currentRoomRef.current) return;

    console.log("✅ Setting ready state:", isReady);
    socket.emit("set-ready", {
      roomId: currentRoomRef.current,
      isReady,
    } as SetReadyData);
  };

  // Add this to your SocketContext value
  const getCurrentUser = useCallback(() => {
    if (!currentUserData) return null;
    return users.find((u) => u.name === currentUserData.name) || null;
  }, [users, currentUserData]);

  const value: SocketContextValue = {
    socket,
    users,
    turnSpeaker,
    roomUsers,
    currentRoom: currentRoomRef.current,
    currentUser: getCurrentUser(), // ADD THIS
    joinRoom,
    leaveRoom,
    passTurn,
    setReady,
    isConnected: isConnectedRef.current,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

// Export types for use in other components
export type {
  SocketUser as User,
  UserData,
  RoomUsers,
  SocketContextValue,
  JoinRoomData,
  LeaveRoomData,
  PassTurnData,
  SetReadyData,
  RoomUsersResponse,
  UserJoinedResponse,
  UserLeftResponse,
  TurnChangeResponse,
};
