import { supabase } from "./supabase";

export async function createDebateOnServer(debate: {
	topic: string;
	name: string;
	position: "for" | "against";
	roomId: string;
}) {
	const { data, error } = await supabase
		.from("debates")
		.upsert({
			topic: debate.topic,
			host_name: debate.name,
			host_position: debate.position,
			room_id: debate.roomId,
		}, {
			onConflict: 'room_id' // Upsert based on client_id
		})
		.select();

	if (error) {
		console.error("Error creating debate:", error);
		throw error;
	}

	return data?.[0];
}