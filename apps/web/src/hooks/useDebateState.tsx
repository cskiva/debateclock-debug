// hooks/useDebateState.ts
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

export interface DebateData {
  topic: string;
  roomId: string;
  position: "for" | "against";
  name: string;
  hostName: string;
  duration?: number;
}

export function useDebateState() {
  const { roomId } = useParams();
  const { users, joinRoom, setReady, isConnected } = useSocket();

  const [debate, setDebate] = useState<DebateData | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    async function loadDebate() {
      if (!roomId) return;

      const { data, error } = await supabase
        .from("debates")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (error) {
        console.error("❌ Failed to load debate:", error);
        return;
      }

      const userSession = sessionStorage.getItem("debateUser");
      const parsedUser = userSession ? JSON.parse(userSession) : null;

      if (!parsedUser?.name || !parsedUser?.position) {
        console.warn("⚠️ No user info in sessionStorage");
        return;
      }

      const fullDebate: DebateData = {
        topic: data.topic,
        roomId: data.room_id,
        duration: data.duration ?? 10,
        name: parsedUser.name,
        position: parsedUser.position,
        hostName: data.host_name,
      };
      console.log("loading debate", fullDebate);
      setDebate(fullDebate);
    }

    loadDebate();
  }, [roomId]);

  useEffect(() => {
    if (!debate || hasJoined) return;

    joinRoom(
      debate.roomId,
      "👽 - Socket context - 👾 [debate, hasJoined, joinRoom] useEffect",
      {
        name: debate.name,
        position: debate.position,
      }
    );

    setHasJoined(true);
  }, [debate, hasJoined, joinRoom]);

  const currentUser = users.find((u) => u.name === debate?.name);

  return {
    ...debate,
    users,
    currentUser,
    isConnected,
    setReady,
    setDebate,
  };
}
