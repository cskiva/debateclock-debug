import { supabase } from "./supabase";

export async function createDebateOnServer(debate: {
	topic: string;
	name: string;
	position: "for" | "against";
	roomId: string;
}) {
	const { error } = await supabase.from("debates").insert({
		topic: debate.topic,
		host_name: debate.name,
		host_position: debate.position,
		room_id: debate.roomId,
	});

	if (error) {
		console.error("Error creating debate:", error);
	}
}
