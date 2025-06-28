import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useDebate } from "@/_context/DebateContext";
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

export interface DebateData {
  topic: string;
  roomId: string;
  position: "for" | "against";
  name: string;
  duration?: number;
}

const STORAGE_KEY = "debateSession";

export function useDebateState() {
  const { roomId } = useParams();
  const { users, joinRoom, setReady, isConnected } = useSocket();
  const { debate: fallbackDebate } = useDebate();

  const [debate, setDebate] = useState<DebateData | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // 🔁 Load from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DebateData;
        if (parsed.roomId === roomId) {
          setDebate(parsed);
        }
      } catch (err) {
        console.warn("Invalid debateSession", err);
      }
    }
  }, [roomId]);

  // 🔌 Join room when debate session is ready
  useEffect(() => {
    if (!debate || hasJoined) return;

    joinRoom(debate.roomId, {
      name: debate.name,
      position: debate.position,
    });

    setHasJoined(true);
  }, [debate, hasJoined, joinRoom]);

  // 💾 Store to sessionStorage
  useEffect(() => {
    if (debate) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(debate));
    }
  }, [debate]);

  // 📡 Load topic/duration from Supabase if missing
  useEffect(() => {
    async function fetchDebate() {
      if (!roomId || !debate) return;

      const { data, error } = await supabase
        .from("debates")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (data && !error) {
        setDebate((prev) =>
          prev
            ? {
                ...prev,
                topic: data.topic,
                duration: data.duration ?? 10,
              }
            : null
        );
      }
    }

    // Use fallback if present
    if (!debate && fallbackDebate?.roomId === roomId && fallbackDebate) {
      setDebate({
        roomId: fallbackDebate.roomId,
        topic: fallbackDebate.topic,
        duration: fallbackDebate.duration ?? 10,
        name: fallbackDebate.name ?? "",
        position: fallbackDebate.position ?? "for",
      });
    } else if (debate && !debate.topic) {
      fetchDebate();
    }
  }, [debate, fallbackDebate, roomId]);

  const currentUser = users.find((u) => u.name === debate?.name);

  return {
    ...debate,
    users,
    currentUser,
    isConnected,
    setReady,
    setDebate, // Used by JoinRoom to set initial values
  };
}
