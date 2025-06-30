/* eslint-disable @typescript-eslint/no-explicit-any */
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

// ✅ Updated interfaces to match new schema
export interface DebateMeta {
  id?: number;
  room_id: string;
  topic: string;
  host_name: string;
  host_position: "for" | "against";
  duration: number;
  status: "waiting" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at?: string;
  participant_count?: number; // From view
  ready_count?: number; // From view
  participants?: ParticipantData[]; // When loaded separately
}

export interface ParticipantData {
  id: number;
  socket_id: string;
  room_id: string;
  name: string;
  position: "for" | "against";
  peer_connection_status: "connected" | "disconnected" | "reconnecting";
  ice_candidates: any[];
  is_ready: boolean;
  is_host: boolean;
  joined_at: string;
  created_at: string;
  updated_at?: string;
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
  users: any[]; // From socket

  // Room management
  roomId: string;
  setRoomId: (roomId: string) => void;
  manuallyJoinRoom: () => void;

  // Socket state
  isConnected: boolean;

  // Loading states
  loading: boolean;
  error: string | null;

  // Participants from database
  dbParticipants: ParticipantData[];
}

// Create the context
const DebateContext = createContext<DebateContextType | undefined>(undefined);

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
  const {
    users,
    joinRoom,
    isConnected,
    generatedRoomId,
    currentRoom,
    setCurrentRoom,
  } = useSocket();

  // 🔥 FIXED: Remove sessionStorage initialization for debate
  const [debate, setDebate] = useState<DebateMeta | null>(null);

  // Keep sessionStorage for user data (me) as it's user-specific
  const [me, setMe] = useState<Me | null>(() => {
    try {
      const saved = sessionStorage.getItem("debate-me");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 🔥 FIXED: Always prioritize URL params for roomId
  const [roomId, setRoomId] = useState<string>(() => {
    // Priority: params > generated (remove sessionStorage dependency)
    if (roomIdFromParams) return roomIdFromParams;
    return generatedRoomId;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [dbParticipants, setDbParticipants] = useState<ParticipantData[]>([]);

  // Update roomId when params change
  useEffect(() => {
    if (roomIdFromParams) {
      setRoomId(roomIdFromParams);
      // 🔥 FIXED: Clear debate state when room changes
      setDebate(null);
    } else if (generatedRoomId && !roomId) {
      setRoomId(generatedRoomId);
    }
  }, [roomIdFromParams, generatedRoomId, roomId]);

  // Set current room when roomId changes
  useEffect(() => {
    if (roomId && roomId !== currentRoom) {
      setCurrentRoom(roomId);
    }
  }, [roomId, currentRoom, setCurrentRoom]);

  // Auto-join room when conditions are met
  useEffect(() => {
    const shouldJoin = me && roomId && isConnected && !hasJoinedRoom;

    console.log("🔍 Auto-join check:", {
      me: !!me,
      roomId: !!roomId,
      isConnected,
      hasJoinedRoom,
      shouldJoin,
    });

    if (shouldJoin) {
      console.log("🚀 Auto-joining room...");
      manuallyJoinRoom();
    }
  }, [me, roomId, isConnected, hasJoinedRoom]);

  // 🔥 FIXED: Always fetch debate from database when roomId changes
  useEffect(() => {
    if (!roomId) return;

    async function loadDebate() {
      setLoading(true);
      setError(null);

      try {
        console.log("🔍 Loading debate for room:", roomId);

        // Load debate with participant count using the view
        const { data: debateData, error: debateDataError } = await supabase
          .from("debates_with_participants")
          .select("*")
          .eq("room_id", roomId)
          .single();

        if (debateDataError) {
          console.error("❌ Failed to load debate:", debateDataError);
          setError(`Failed to load debate: ${debateDataError.message}`);
          return;
        }

        // Load participants separately for detailed info
        const { data: participantsData, error: participantsError } =
          await supabase
            .from("participants")
            .select(
              `
            id,
            socket_id,
            room_id,
            name,
            position,
            peer_connection_status,
            ice_candidates,
            is_ready,
            is_host,
            joined_at,
            created_at,
            updated_at
          `
            )
            .eq("room_id", roomId)
            .order("joined_at", { ascending: true });

        if (participantsError) {
          console.warn("⚠️ Could not load participants:", participantsError);
        }

        const fullDebate: DebateMeta = {
          id: debateData.id,
          room_id: debateData.room_id,
          topic: debateData.topic,
          host_name: debateData.host_name,
          host_position: debateData.host_position,
          duration: debateData.duration || 10,
          status: debateData.status || "waiting",
          created_at: debateData.created_at,
          updated_at: debateData.updated_at,
          participant_count: debateData.participant_count || 0,
          ready_count: debateData.ready_count || 0,
          participants: (participantsData as ParticipantData[]) || [],
        };

        setDebate(fullDebate);
        setDbParticipants((participantsData as ParticipantData[]) || []);

        // 🔥 FIXED: Only cache to sessionStorage AFTER fetching from database
        sessionStorage.setItem("debate", JSON.stringify(fullDebate));

        console.log("✅ Debate loaded:", fullDebate);
      } catch (err: any) {
        console.error("💥 Error loading debate:", err);
        setError(`Error loading debate: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadDebate();
  }, [roomId]); // This will re-run whenever roomId changes

  // 🔥 FIXED: Periodically refresh participant data
  useEffect(() => {
    if (!roomId) return;

    const refreshParticipants = async () => {
      try {
        const { data: participantsData } = await supabase
          .from("participants")
          .select(
            `
            id,
            socket_id,
            room_id,
            name,
            position,
            peer_connection_status,
            ice_candidates,
            is_ready,
            is_host,
            joined_at,
            created_at,
            updated_at
          `
          )
          .eq("room_id", roomId)
          .eq("peer_connection_status", "connected")
          .order("joined_at", { ascending: true });

        if (participantsData) {
          setDbParticipants(participantsData as ParticipantData[]);
        }
      } catch (error) {
        console.warn("Could not refresh participants:", error);
      }
    };

    // Refresh every 30 seconds
    const interval = setInterval(refreshParticipants, 30000);
    return () => clearInterval(interval);
  }, [roomId]);

  // 🔥 FIXED: Save user data to sessionStorage when it changes
  useEffect(() => {
    if (me) {
      sessionStorage.setItem("debate-me", JSON.stringify(me));
    }
  }, [me]);

  const manuallyJoinRoom = () => {
    console.log("🚀 manuallyJoinRoom called:");
    console.log("  - roomId:", roomId);
    console.log("  - me:", me);
    console.log("  - isConnected:", isConnected);
    console.log("  - hasJoinedRoom:", hasJoinedRoom);

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

    if (hasJoinedRoom) {
      console.log("⚠️ Already joined room, skipping");
      return;
    }

    console.log("✅ Joining room with socket");

    // Call joinRoom with the correct data structure the server expects
    joinRoom(roomId, "👽 manual join from DebateContext", {
      name: me.name,
      position: me.position,
      isReady: true,
    });

    setHasJoinedRoom(true);
  };

  // Reset join state when room changes
  useEffect(() => {
    setHasJoinedRoom(false);
  }, [roomId]);

  // Reset join state when socket disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasJoinedRoom(false);
    }
  }, [isConnected]);

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

    // Loading states
    loading,
    error,

    // Database participants
    dbParticipants,
  };

  return (
    <DebateContext.Provider value={value}>{children}</DebateContext.Provider>
  );
}
