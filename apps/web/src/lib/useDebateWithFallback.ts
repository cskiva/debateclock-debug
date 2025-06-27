import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useDebate } from "@/_context/DebateContext";
import { useParams } from "react-router-dom";

export function useDebateWithFallback() {
	const { debate, setDebate } = useDebate();
	const { roomId } = useParams();

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchDebate() {
			if (!roomId) return;

			// Only fetch if debate is missing or debate.roomId doesn't match the current route param
			if (!debate || debate.roomId !== roomId) {
				setLoading(true);

				const { data, error } = await supabase
					.from("debates")
					.select("room_id, topic, host_name, host_position")
					.eq("room_id", roomId)
					.single();

				if (error) {
					console.error("[DEBUG] Supabase error:", error);
					setError("Could not load debate from server.");
				} else if (data) {
					setDebate({
						roomId: data.room_id,
						topic: data.topic,
						name: data.host_name,
						position: data.host_position,
					});
				}

				setLoading(false);
			} else {
				// Debate is already in context and matches roomId
				setLoading(false);
			}
		}

		fetchDebate();
	}, [debate, roomId, setDebate]);

	return { debate, loading, error };
}
