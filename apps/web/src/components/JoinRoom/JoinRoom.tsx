// components/JoinRoom.tsx
import { useState, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useSocket, type SocketUser } from "@/_context/SocketContext";
import { Loader2, MessageSquare, Users } from "lucide-react";

import { useDebateState } from "@/_context/DebateContext";
import { supabase } from "@/lib/supabase";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { isConnected, users, generatedUserId: userIdUuid4 } = useSocket();
  const { setMe, debate } = useDebateState();

  const { users: debateStateUsers, ...debateInfo } = useDebateState();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<"for" | "against">("against");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!roomId || !name.trim()) return;

    const trimmedName = name.trim();
    setIsJoining(true);
    setError(null);

    try {
      console.log("🚀 Creating participant in database...");

      // First, verify the debate exists
      const { data: existingDebate, error: debateError } = await supabase
        .from("debates")
        .select("id, room_id, status")
        .eq("room_id", roomId)
        .single();

      if (debateError || !existingDebate) {
        throw new Error("Debate room not found");
      }

      if (
        existingDebate.status === "completed" ||
        existingDebate.status === "cancelled"
      ) {
        throw new Error("This debate has already ended");
      }

      // Check if user already exists in this room
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("room_id", roomId)
        .eq("name", trimmedName)
        .single();

      if (existingParticipant) {
        throw new Error(
          "A participant with this name already exists in this room"
        );
      }

      // Create participant record in database
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .insert({
          socket_id: userIdUuid4, // Using the generated UUID as socket_id
          room_id: roomId,
          name: trimmedName,
          position: position,
          peer_connection_status: "disconnected", // Will be updated when socket connects
          ice_candidates: [],
          is_ready: false,
          is_host: false,
        })
        .select()
        .single();

      if (participantError) {
        console.error("❌ Failed to create participant:", participantError);
        throw new Error(`Failed to join room: ${participantError.message}`);
      }

      console.log("✅ Participant created:", participantData);

      // Set user data in context (this will trigger auto-join via socket)
      setMe({
        id: userIdUuid4,
        name: trimmedName,
        position,
        isReady: false,
      });

      console.log("✅ Navigating to lobby...");
      navigate(`/lobby/${roomId}`);
    } catch (err: any) {
      console.error("❌ Error joining room:", err);
      setError(err.message || "Failed to join room");
      setIsJoining(false);
    }
  };

  const isFormValid = name.trim() && isConnected && !isJoining;
  const hostPosition = users.find((user: SocketUser) => user.position === "for")
    ? "for"
    : users.find((user: SocketUser) => user.position === "against")
    ? "against"
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <p>Debate State Users</p>
      <p>{JSON.stringify(debateStateUsers)}</p>
      <p>Socket State Users</p>
      <p>{JSON.stringify(users)}</p>

      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Join Debate
          </h1>
          <p className="text-slate-600">
            {isConnected ? "Connected to server" : "Connecting..."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-800 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Debate Info Card */}
        {(debateInfo.debate || debate) && (
          <Card className="mb-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Debate Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-slate-900 mb-2">
                {debateInfo.debate?.topic || debate?.topic}
              </p>
              <p className="text-sm text-slate-600">
                Hosted by:{" "}
                <strong>
                  {debateInfo.debate?.host_name || debate?.host_name}
                </strong>
              </p>
              <p className="text-xs text-slate-500 mt-2">Room ID: {roomId}</p>
            </CardContent>
          </Card>
        )}

        {/* Join Form Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-indigo-600" />
              Join as Participant
            </CardTitle>
            <CardDescription>
              Enter your details to join this debate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
                className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isJoining}
              />
            </div>

            {/* Position Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Your Position
              </Label>
              <Select
                value={position}
                onValueChange={(
                  value:
                    | string
                    | ((prevState: "for" | "against") => "for" | "against")
                ) =>
                  (value === "for" || value === "against") && setPosition(value)
                }
                disabled={isJoining}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="for">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      For
                    </div>
                  </SelectItem>
                  <SelectItem value="against">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Against
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {hostPosition && (
                <p className="text-xs text-slate-500">
                  Host is taking the "{hostPosition}" position
                </p>
              )}
            </div>

            {/* Connection Status */}
            {!isConnected && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting to server...
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoin}
              disabled={!isFormValid}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Join Debate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Participants */}
        {users.length > 0 && (
          <Card className="mt-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
            <CardContent className="pt-6">
              <h3 className="font-medium text-slate-900 mb-3">
                Current Participants
              </h3>
              <div className="space-y-2">
                {users.map((user: SocketUser) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.position === "for" ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-sm text-slate-700">{user.name}</span>
                    <span className="text-xs text-slate-500">
                      ({user.position})
                    </span>
                    {user.isReady && (
                      <span className="text-xs text-green-600 font-medium">
                        Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default JoinRoom;
