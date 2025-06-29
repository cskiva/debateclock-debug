import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

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

export function useDebateState() {
  const { roomId } = useParams();
  const { users, joinRoom, setReady, isConnected } = useSocket();

  const [debate, setDebate] = useState<DebateMeta | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!roomId) return;

    async function loadDebate() {
      const { data: debateData, error: debateDataError } = await supabase
        .from("debates")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (debateDataError) {
        console.error("❌ Failed to load debate:", debateDataError);
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
    }

    loadDebate();
  }, [roomId]);

  const manuallyJoinRoom = () => {
    if (!roomId || !me) return;

    joinRoom(roomId, "👽 manual join from useDebateState", {
      name: me.name,
      position: me.position,
      isReady: me.isReady,
    });
  };

  return {
    ...debate,
    users,
    me,
    setMe,
    isConnected,
    setReady,
    setDebate,
    manuallyJoinRoom, // 🔥 Explicit join function
  };
}
