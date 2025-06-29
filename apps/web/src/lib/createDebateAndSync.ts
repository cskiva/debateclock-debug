// lib/createDebateAndSync.ts
import { supabase } from "@/lib/supabase";

interface CreateDebateParams {
	topic: string;
	hostName: string;
	position: "for" | "against";
	roomId: string;
}

export async function createDebateOnServer({
	topic,
	hostName,
	position,
	roomId
}: CreateDebateParams) {
	try {
		console.log("💾 Creating debate in Supabase:", { topic, hostName, position, roomId });

		// 1. Create the debate record
		const { error: debateError } = await supabase
			.from("debates")
			.insert({
				room_id: roomId,
				topic,
				host_name: hostName,
				host_position: position,
				duration: 10,
				created_at: new Date().toISOString(),
			});

		if (debateError) {
			console.error("❌ Failed to create debate:", debateError);
			throw new Error(`Failed to create debate: ${debateError.message}`);
		}

		console.log("✅ Debate created successfully in Supabase");

		// ✅ DON'T create participant record here!
		// The socket server will handle participant creation when joinRoom is called
		// This prevents the duplicate entry issue

		return { success: true };

	} catch (error) {
		console.error("💥 Error in createDebateOnServer:", error);
		throw error;
	}
}