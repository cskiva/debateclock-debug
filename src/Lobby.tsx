import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSocket } from "./_context/SocketContext";

function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams<{ roomId: string }>();
  const { joinRoom, users, setReady, isConnected, currentRoom } = useSocket();

  const { topic, position, name, isHost } = location.state || {
    topic: "",
    position: "for",
    name: "",
    isHost: true,
  };

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [streamReady, setStreamReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration] = useState(5); // Default duration in minutes
  const videoRef = useRef<HTMLVideoElement>(null);

  // Join room when component mounts
  useEffect(() => {
    if (roomId && name && isConnected && !currentRoom) {
      joinRoom(roomId, {
        name,
        position: position as "for" | "against",
      });
    }
  }, [roomId, name, position, isConnected, currentRoom, joinRoom]);

  // Setup webcam
  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamReady(true);
          // Auto-set ready when webcam is working
          handleSetReady(true);
        }
      } catch (error) {
        console.log("Camera/Mic access denied:", error);
        setStreamReady(false);
      }
    };

    setupCamera();

    // Cleanup function to stop media stream
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    // Only start countdown when we have at least 2 users and both are ready
    const readyUsers = users.filter((user) => user.isReady);
    const canStart = users.length >= 2 && readyUsers.length === users.length;

    if (!canStart) {
      setSecondsLeft(20); // Reset countdown
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Navigate to debate page when countdown ends
          navigate(`/debate/${roomId}`, {
            state: { topic, position, name, roomId },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [users, navigate, topic, position, name, roomId]);

  const handleSetReady = (ready: boolean) => {
    setIsReady(ready);
    setReady(ready);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCountdownColor = () => {
    if (secondsLeft <= 5) return "text-red-600";
    if (secondsLeft <= 10) return "text-amber-600";
    return "text-green-600";
  };

  // Get users by position
  const forUser = users.find((user) => user.position === "for");
  const againstUser = users.find((user) => user.position === "against");
  const currentUser = users.find((user) => user.name === name);

  const readyUsers = users.filter((user) => user.isReady);
  const canStart = users.length >= 2 && readyUsers.length === users.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Debate Lobby
          </h1>
          <p className="text-slate-600">
            {canStart
              ? "All participants ready!"
              : "Waiting for participants..."}
          </p>
        </div>

        {/* Topic Card */}
        <Card className="mb-8 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-indigo-600" />
              Debate Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-900 leading-relaxed">
              {topic}
            </p>
          </CardContent>
        </Card>

        {/* Countdown Card */}
        <Card
          className={`mb-8 shadow-xl border-0 text-white ${
            canStart
              ? "bg-gradient-to-r from-green-600 to-emerald-600"
              : "bg-gradient-to-r from-amber-600 to-orange-600"
          }`}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-6 h-6" />
                <span className="text-lg font-medium">
                  {canStart ? "Starting in" : "Waiting for participants"}
                </span>
              </div>
              {canStart ? (
                <>
                  <div className="text-6xl font-bold mb-2 text-white">
                    {formatTime(secondsLeft)}
                  </div>
                  <p className="text-green-100">
                    Get ready! The debate will begin automatically.
                  </p>
                </>
              ) : (
                <div className="text-2xl font-bold mb-2">
                  {readyUsers.length}/{users.length} Ready
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ready Button */}
        {!isReady && streamReady && (
          <div className="text-center mb-6">
            <Button
              onClick={() => handleSetReady(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              I'm Ready
            </Button>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* FOR Position */}
          <Card
            className={`shadow-xl border-0 overflow-hidden ${
              forUser
                ? "bg-white/95 backdrop-blur-sm ring-2 ring-green-500 ring-opacity-50"
                : "bg-slate-100/80 backdrop-blur-sm"
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  FOR
                </CardTitle>
                {forUser && forUser.isReady && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {forUser && !forUser.isReady && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Connecting
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video mb-4">
                {forUser && forUser.name === name ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!streamReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-700">
                    <div className="text-center text-slate-400">
                      <VideoOff className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">
                        {forUser
                          ? "Participant video"
                          : "Waiting for participant..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lower Third */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">
                      {forUser ? forUser.name : "Waiting..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AGAINST Position */}
          <Card
            className={`shadow-xl border-0 overflow-hidden ${
              againstUser
                ? "bg-white/95 backdrop-blur-sm ring-2 ring-red-500 ring-opacity-50"
                : "bg-slate-100/80 backdrop-blur-sm"
            }`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  AGAINST
                </CardTitle>
                {againstUser && againstUser.isReady && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {againstUser && !againstUser.isReady && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video mb-4">
                {againstUser && againstUser.name === name ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!streamReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-700">
                    <div className="text-center text-slate-400">
                      <VideoOff className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">
                        {againstUser
                          ? "Participant video"
                          : "Waiting for participant..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lower Third */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">
                      {againstUser ? againstUser.name : "Waiting..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card className="mb-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
          <CardContent className="pt-6">
            <h3 className="font-medium text-slate-900 mb-3">
              Participants ({users.length}/2)
            </h3>
            <div className="space-y-2">
              {users.map((user) => (
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
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Video className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-slate-900">Ready to debate?</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The debate will start automatically when the countdown reaches
                  zero. Make sure your camera and microphone are working
                  properly. You'll have <strong>{duration} minutes</strong> for
                  each round.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Lobby;
