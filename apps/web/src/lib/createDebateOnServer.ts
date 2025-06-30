// lib/createDebateOnServer.ts
import { supabase } from "@/lib/supabase";

interface CreateDebateParams {
	topic: string;
	hostName: string;
	position: "for" | "against";
	roomId: string;
	duration?: number;
}

export async function createDebateOnServer({
	topic,
	hostName,
	position,
	roomId,
	duration = 10
}: CreateDebateParams) {
	try {
		console.log("💾 Creating debate in Supabase:", { topic, hostName, position, roomId, duration });

		// ✅ Create the debate record with new schema
		const { error: debateError } = await supabase
			.from("debates")
			.insert({
				room_id: roomId,
				topic: topic.trim(),
				host_name: hostName.trim(),
				host_position: position,
				duration: duration,
				status: 'waiting', // Initial status
				created_at: new Date().toISOString(),
			});

		if (debateError) {
			console.error("❌ Failed to create debate:", debateError);

			// Handle specific error cases
			if (debateError.code === '23505') {
				throw new Error(`Room ID ${roomId} already exists. Please try again.`);
			}

			throw new Error(`Failed to create debate: ${debateError.message}`);
		}

		console.log("✅ Debate created successfully in Supabase");

		// ✅ Return the debate data for confirmation
		const { data: createdDebate, error: fetchError } = await supabase
			.from("debates")
			.select(`
        id,
        room_id,
        topic,
        host_name,
        host_position,
        duration,
        status,
        created_at
      `)
			.eq("room_id", roomId)
			.single();

		if (fetchError) {
			console.warn("⚠️ Could not fetch created debate:", fetchError);
		}

		return {
			success: true,
			debate: createdDebate
		};

	} catch (error) {
		console.error("💥 Error in createDebateOnServer:", error);
		throw error;
	}
}

// ✅ Helper function to update debate status
export async function updateDebateStatus(roomId: string, status: 'waiting' | 'active' | 'completed' | 'cancelled') {
	try {
		const { error } = await supabase
			.from("debates")
			.update({
				status,
				updated_at: new Date().toISOString()
			})
			.eq("room_id", roomId);

		if (error) {
			console.error("❌ Failed to update debate status:", error);
			throw error;
		}

		console.log(`✅ Updated debate ${roomId} status to ${status}`);
		return { success: true };

	} catch (error) {
		console.error("💥 Error updating debate status:", error);
		throw error;
	}
}

// ✅ Helper function to get debate with participants
export async function getDebateWithParticipants(roomId: string) {
	try {
		const { data: debate, error: debateError } = await supabase
			.from("debates")
			.select("*")
			.eq("room_id", roomId)
			.single();

		if (debateError) {
			throw new Error(`Debate not found: ${debateError.message}`);
		}

		const { data: participants, error: participantsError } = await supabase
			.from("participants")
			.select(`
        id,
        socket_id,
        name,
        position,
        peer_connection_status,
        is_ready,
        is_host,
        joined_at
      `)
			.eq("room_id", roomId)
			.eq("peer_connection_status", "connected")
			.order("joined_at", { ascending: true });

		if (participantsError) {
			console.warn("⚠️ Could not fetch participants:", participantsError);
		}

		return {
			...debate,
			participants: participants || []
		};

	} catch (error) {
		console.error("💥 Error getting debate with participants:", error);
		throw error;
	}
}