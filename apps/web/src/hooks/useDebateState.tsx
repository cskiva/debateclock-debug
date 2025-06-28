import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useDebate } from "@/_context/DebateContext"; // fallback from Supabase
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

export interface DebateData {
  topic: string;
  roomId: string;
  position: "for" | "against";
  name: string;
  duration?: number;
}

const STORAGE_KEY = "debateData";

export function useDebateState() {
  const { roomId } = useParams();
  const { users, joinRoom, setReady, isConnected } = useSocket();
  const { debate: fallbackDebate } = useDebate();

  const [localUser, setLocalUser] = useState<DebateData | null>(null);
  const [debateInfo, setDebateInfo] = useState<DebateData | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // 🧠 Restore from sessionStorage
  useEffect(() => {
    if (!roomId) return;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DebateData;
        if (parsed.roomId === roomId) {
          setLocalUser(parsed);
        }
      } catch (err) {
        console.warn("Invalid debateData in storage", err);
      }
    }
  }, [roomId]);

  // 🔌 Join the room after loading localUser
  useEffect(() => {
    if (!roomId || !localUser || hasJoined) return;

    joinRoom(roomId, {
      name: localUser.name,
      position: localUser.position,
    });

    setHasJoined(true);
  }, [roomId, localUser, joinRoom, hasJoined]);

  // 🧠 Persist to sessionStorage on update
  useEffect(() => {
    if (localUser) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
    }
  }, [localUser]);

  // 🧾 Fetch debate info from Supabase or fallback
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
          roomId: data.room_id,
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
    setLocalUser, // 👈 expose this so JoinRoom can call it
  };
}
