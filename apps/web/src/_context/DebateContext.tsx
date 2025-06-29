import { useSocket } from "@/_context/SocketContext";
import { supabase } from "@/lib/supabase";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";

export interface DebateMeta {
  topic: string;
  roomId: string;
  duration: number;
  hostName: string;
  hostPosition: "for" | "against";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debateParticipants: any[] | null;
}

export interface Me {
  id: string;
  name: string;
  position: "for" | "against";
  isReady: boolean;
}

interface DebateContextType {
  // Debate data
  debate: DebateMeta | null;
  setDebate: (debate: DebateMeta | null) => void;

  // User data
  me: Me | null;
  setMe: (me: Me | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[]; // From socket

  // Room management
  roomId: string;
  setRoomId: (roomId: string) => void;
  manuallyJoinRoom: () => void;

  // Socket state
  isConnected: boolean;
  setReady: (ready: boolean) => void;

  // Loading states
  loading: boolean;
  error: string | null;
}

// Create the context
const DebateContext = createContext<DebateContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useDebateState() {
  const context = useContext(DebateContext);
  if (!context) {
    throw new Error("useDebateState must be used within a DebateProvider");
  }
  return context;
}

// Provider component
interface DebateProviderProps {
  children: ReactNode;
}

export function DebateProvider({ children }: DebateProviderProps) {
  const { roomId: roomIdFromParams } = useParams();
  const { users, joinRoom, setReady, isConnected, generatedRoomId } =
    useSocket();

  // Persistent state
  const [debate, setDebate] = useState<DebateMeta | null>(() => {
    // Try to restore from sessionStorage
    try {
      const saved = sessionStorage.getItem("debate");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [me, setMe] = useState<Me | null>(() => {
    // Try to restore from sessionStorage
    try {
      const saved = sessionStorage.getItem("debate-me");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [roomId, setRoomId] = useState<string>(() => {
    // Priority: params > sessionStorage > generated
    if (roomIdFromParams) return roomIdFromParams;
    try {
      const saved = sessionStorage.getItem("debate-roomId");
      return saved || generatedRoomId;
    } catch {
      return generatedRoomId;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist state to sessionStorage
  useEffect(() => {
    if (debate) {
      sessionStorage.setItem("debate", JSON.stringify(debate));
    }
  }, [debate]);

  useEffect(() => {
    if (me) {
      sessionStorage.setItem("debate-me", JSON.stringify(me));
    }
  }, [me]);

  useEffect(() => {
    if (roomId) {
      sessionStorage.setItem("debate-roomId", roomId);
    }
  }, [roomId]);

  // Update roomId when params or generated ID changes
  useEffect(() => {
    if (roomIdFromParams) {
      setRoomId(roomIdFromParams);
    } else if (generatedRoomId && !roomId) {
      setRoomId(generatedRoomId);
    }
  }, [roomIdFromParams, generatedRoomId, roomId]);

  // Load debate data when roomId changes
  useEffect(() => {
    if (!roomId) return;

    async function loadDebate() {
      setLoading(true);
      setError(null);

      try {
        console.log("🔍 Loading debate for room:", roomId);

        const { data: debateData, error: debateDataError } = await supabase
          .from("debates")
          .select("*")
          .eq("room_id", roomId)
          .single();

        if (debateDataError) {
          console.error("❌ Failed to load debate:", debateDataError);
          setError(`Failed to load debate: ${debateDataError.message}`);
          return;
        }

        const { data: roomUsers } = await supabase
          .from("participants")
          .select("*")
          .eq("room_id", roomId);

        const fullDebate: DebateMeta = {
          topic: debateData.topic,
          roomId: debateData.room_id,
          duration: debateData.duration ?? 10,
          hostName: debateData.host_name,
          hostPosition: debateData.host_position,
          debateParticipants: roomUsers ?? [],
        };

        setDebate(fullDebate);
        console.log("✅ Debate loaded:", fullDebate);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("💥 Error loading debate:", err);
        setError(`Error loading debate: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadDebate();
  }, [roomId]);

  const manuallyJoinRoom = () => {
    console.log("🚀 manuallyJoinRoom called:");
    console.log("  - roomId:", roomId);
    console.log("  - me:", me);
    console.log("  - isConnected:", isConnected);

    if (!roomId) {
      console.error("❌ No room ID available");
      return;
    }

    if (!me) {
      console.error("❌ No user data available");
      return;
    }

    if (!isConnected) {
      console.error("❌ Socket not connected");
      return;
    }

    console.log("✅ Joining room with socket");
    joinRoom(roomId, "👽 manual join from DebateContext", {
      name: me.name,
      position: me.position,
      isReady: me.isReady,
    });
  };

  // Clear state when needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearDebateState = () => {
    setDebate(null);
    setMe(null);
    setRoomId("");
    sessionStorage.removeItem("debate");
    sessionStorage.removeItem("debate-me");
    sessionStorage.removeItem("debate-roomId");
  };

  const value: DebateContextType = {
    // Debate data
    debate,
    setDebate,

    // User data
    me,
    setMe,
    users,

    // Room management
    roomId,
    setRoomId,
    manuallyJoinRoom,

    // Socket state
    isConnected,
    setReady,

    // Loading states
    loading,
    error,
  };

  return (
    <DebateContext.Provider value={value}>{children}</DebateContext.Provider>
  );
}

// Debug hook to see context state
export function useDebateDebug() {
  const context = useDebateState();

  useEffect(() => {
    console.log("🔍 Debate Context State:", {
      debate: context.debate,
      me: context.me,
      roomId: context.roomId,
      users: context.users,
      isConnected: context.isConnected,
      loading: context.loading,
      error: context.error,
    });
  }, [context]);

  return context;
}
