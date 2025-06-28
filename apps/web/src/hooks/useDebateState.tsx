import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useDebate } from "@/_context/DebateContext"; // your Supabase fallback context
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

export interface DebateData {
  topic: string;
  roomId: string;
  position: "for" | "against";
  name: string;
  duration?: number;
}

export function useDebateState() {
  const { roomId } = useParams();
  const { users, joinRoom, setReady, isConnected } = useSocket();
  const { debate: fallbackDebate } = useDebate(); // from Supabase
  const [localUser, setLocalUser] = useState<DebateData | null>(null);
  const [debateInfo, setDebateInfo] = useState<DebateData | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const sessionData = sessionStorage.getItem("debateData");
    if (sessionData) {
      const parsed = JSON.parse(sessionData) as DebateData;
      if (parsed.roomId === roomId) {
        setLocalUser(parsed);
        joinRoom(roomId, {
          name: parsed.name,
          position: parsed.position,
        });
      }
    }
  }, [roomId, joinRoom]);

  useEffect(() => {
    async function fetchFromSupabase() {
      if (!roomId) return;

      const { data, error } = await supabase
        .from("debates")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (data && !error) {
        setDebateInfo({
          topic: data.topic,
          roomId: data.roomId,
          position: localUser?.position || "for",
          name: localUser?.name || "",
          duration: data.duration ?? 10,
        });
      }
    }

    if (!debateInfo && fallbackDebate?.roomId === roomId) {
      setDebateInfo({
        topic: fallbackDebate?.topic ?? "",
        roomId: fallbackDebate?.roomId ?? "",
        position: localUser?.position || "for",
        name: localUser?.name || "",
        duration: fallbackDebate?.duration ?? 0,
      });
    } else if (!debateInfo) {
      fetchFromSupabase();
    }
  }, [fallbackDebate, roomId, localUser, debateInfo]);

  const currentUser = users.find((u) => u.name === localUser?.name);

  return {
    roomId,
    topic: debateInfo?.topic,
    duration: debateInfo?.duration,
    position: localUser?.position,
    name: localUser?.name,
    users,
    currentUser,
    isConnected,
    setReady,
  };
}
