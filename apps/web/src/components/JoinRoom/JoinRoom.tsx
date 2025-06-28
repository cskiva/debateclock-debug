// components/JoinRoom.tsx
import { useEffect, useState, type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useSocket, type SocketUser } from "@/_context/SocketContext";
import { Loader2, MessageSquare, Users } from "lucide-react";

import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { useDebateState } from "@/hooks/useDebateState";

function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { joinRoom, isConnected, users } = useSocket();
  const { setLocalUser } = useDebateState(); // destructure from the hook

  const [name, setName] = useState("");
  const [position, setPosition] = useState<"for" | "against">("against");
  const [isJoining, setIsJoining] = useState(false);
  const [debateInfo, setDebateInfo] = useState<{
    topic: string;
    hostName: string;
  } | null>(null);

  useEffect(() => {
    // Fetch debate info from your API
    const fetchDebateInfo = async () => {
      try {
        // Replace with your actual API call
        const response = await fetch(`/api/debates/${roomId}`);
        const data = await response.json();
        setDebateInfo({
          topic: data.topic,
          hostName: data.host_name,
        });
      } catch (error) {
        console.error("Failed to fetch debate info:", error);
      }
    };

    if (roomId) {
      fetchDebateInfo();
    }
  }, [roomId]);

  const handleJoin = async () => {
    if (!roomId || !name.trim()) return;

    setLocalUser({
      name: name.trim(),
      position,
      topic: debateInfo?.topic || "",
      roomId,
      duration: 0,
    });

    setIsJoining(true);

    try {
      // Join the socket room
      joinRoom(roomId, {
        name: name.trim(),
        position,
      });

      // Navigate to lobby
      navigate(`/lobby/${roomId}`, {
        state: {
          topic: debateInfo?.topic || "",
          position,
          name: name.trim(),
          roomId,
          isHost: false,
        },
      });
    } catch (error) {
      console.error("Failed to join room:", error);
      setIsJoining(false);
    }
  };

  const isFormValid = name.trim() && isConnected;
  const hostPosition = users.find((user: SocketUser) => user.position === "for")
    ? "for"
    : users.find((user: SocketUser) => user.position === "against")
    ? "against"
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
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

        {/* Debate Info Card */}
        {debateInfo && (
          <Card className="mb-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Debate Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-slate-900 mb-2">
                {debateInfo.topic}
              </p>
              <p className="text-sm text-slate-600">
                Hosted by: <strong>{debateInfo.hostName}</strong>
              </p>
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
              disabled={!isFormValid || isJoining}
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
