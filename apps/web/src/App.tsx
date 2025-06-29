import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { MessageSquare, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { useEffect, useState } from "react";

import { Button } from "./components/ui/button";
import DebateLinksCard from "./components/DebateLinksCard";
import Header from "./components/Header";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { createDebateOnServer } from "./lib/createDebateAndSync";
import { useDebateState } from "./_context/DebateContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./_context/SocketContext";

// Debug helper functions
function generateRandomName(): string {
  const firstNames = [
    "Alex",
    "Jordan",
    "Casey",
    "Taylor",
    "Morgan",
    "Riley",
    "Avery",
    "Quinn",
    "Sage",
    "River",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Brown",
    "Davis",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}

function generateRandomDebateTopic(): string {
  const topics = [
    "Should artificial intelligence be regulated by government oversight?",
    "Is remote work better than traditional office environments?",
    "Should social media platforms be held responsible for content moderation?",
    "Is nuclear energy the best solution for climate change?",
    "Should universities eliminate standardized testing requirements?",
    "Is cryptocurrency a viable replacement for traditional currency?",
    "Should genetic engineering be used to enhance human capabilities?",
    "Is universal basic income necessary for economic stability?",
    "Should space exploration funding be prioritized over Earth-based issues?",
    "Is online education as effective as in-person learning?",
  ];

  return topics[Math.floor(Math.random() * topics.length)];
}

function App() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");
  const [hostName, setHostName] = useState("");
  const [links, setLinks] = useState<{
    invite: string;
    delivery: string;
  } | null>(null);
  const [roomJoined, setRoomJoined] = useState(false);

  const {
    setCurrentRoom,
    generatedRoomId: roomIdUuid4,
    generatedUserId: userIdUuid4,
    users: socketUsers,
  } = useSocket();
  const {
    users: debateStateUsers,
    setMe,
    manuallyJoinRoom,
    me,
  } = useDebateState();
  const navigate = useNavigate();

  // Auto-generate values on component mount for debugging
  useEffect(() => {
    setHostName(generateRandomName());
    setTopic(generateRandomDebateTopic());
    setPosition(Math.random() > 0.5 ? "for" : "against");
  }, []);

  // Join room after me is set
  useEffect(() => {
    if (me && !roomJoined && links) {
      console.log("🚀 Me is set, now joining room:", me);
      manuallyJoinRoom();
      setRoomJoined(true);
    }
  }, [me, roomJoined, links, manuallyJoinRoom]);

  function handleStart() {
    const roomId = roomIdUuid4;

    console.log("🎯 Starting debate with roomId:", roomId);
    console.log("🎯 User ID:", userIdUuid4);
    console.log("🎯 Host name:", hostName);

    // Create the debate in Supabase first
    createDebateOnServer({ topic, hostName, position, roomId });

    // Set the room in socket context
    setCurrentRoom(roomId);

    console.log("setting Me", hostName, position, userIdUuid4);

    // Set yourself in local state (this will trigger the useEffect above)
    setMe({
      id: userIdUuid4,
      name: hostName,
      position,
      isReady: false,
    });

    // Show invite/viewer links
    setLinks({
      invite: `/join/${roomId}`,
      delivery: `/watch/${roomId}`,
    });

    console.log("✅ Setup complete, waiting for me state to update...");
  }

  useEffect(() => {
    if (socketUsers.length > 0) {
      console.log("📡 socketUsers", socketUsers);
    } else {
      console.log("📡 socketUsers List is 0");
    }
  }, [socketUsers]);

  useEffect(() => {
    if (debateStateUsers.length > 0) {
      console.log("🏛️ debateStateUsers", debateStateUsers);
    } else {
      console.log("🏛️ debateStateUsers List is 0");
    }
  }, [debateStateUsers]);

  // Debug: Log when me changes
  useEffect(() => {
    if (me) {
      console.log("👤 Me updated:", me);
    } else {
      console.log("👤 Me is null/undefined");
    }
  }, [me]);

  function handleNext() {
    if (!links) return;

    const roomId = links.invite.split("/").pop() ?? "";

    navigate(`/lobby/${roomId}?host=true`);
  }

  const isFormValid = hostName.trim() && topic.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <Header />

        {/* Main Form Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Debate Setup
            </CardTitle>
            <CardDescription>
              Fill in the details below to create your debate room
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
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name"
                className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Topic Input */}
            <div className="space-y-2">
              <Label
                htmlFor="topic"
                className="text-sm font-medium text-slate-700"
              >
                Debate Topic
              </Label>
              <Input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Should artificial intelligence be regulated?"
                className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Position Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Your Position
              </Label>
              <Select
                value={position}
                onValueChange={(value) =>
                  value == "for" || (value == "against" && setPosition(value))
                }
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
            </div>

            {/* Host Button */}
            <Button
              onClick={handleStart}
              disabled={!isFormValid}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4 mr-2" />
              Host Debate
            </Button>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {me && (
          <Card className="mt-4 border border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-sm">
                <p>
                  <strong>Current User:</strong> {me.name} ({me.position})
                </p>
                <p>
                  <strong>Room ID:</strong> {roomIdUuid4}
                </p>
                <p>
                  <strong>Socket Users:</strong> {socketUsers.length}
                </p>
                <p>
                  <strong>Debate Users:</strong> {debateStateUsers.length}
                </p>
                <p>
                  <strong>Room Joined:</strong> {roomJoined ? "✅" : "❌"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links Card */}
        {links && (
          <DebateLinksCard
            topic={topic}
            handleNext={handleNext}
            roomId={roomIdUuid4}
          />
        )}

        {/* Info Card */}
        <Card className="mt-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-slate-900">How it works</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Share the <strong>participant link</strong> with your debate
                  opponent and the <strong>viewer link</strong> with your
                  audience. Once everyone joins, you can start your structured
                  debate with timed rounds and real-time engagement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
