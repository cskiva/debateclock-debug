import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import UsersList from "./components/UsersList";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();

  // ONLY use socket for user management - remove useDebateState users
  const { users, joinRoom, setReady, currentRoom, currentUser } = useSocket();
  // FIXED - more explicit:
  const routeState = location.state;
  const storedData = sessionStorage.getItem("debateData");

  console.log("🔍 RAW DATA:", { routeState, storedData });

  const debateData = routeState || (storedData ? JSON.parse(storedData) : {});

  console.log("🔍 EXTRACTED DATA:", debateData);

  const topic = debateData?.topic;
  const position = debateData?.position;
  const name = debateData?.name;

  console.log("🔍 FINAL VALUES:", { topic, position, name, roomId });

  const duration = debateData.duration || 10;

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [localStreamHealthy, setLocalStreamHealthy] = useState(false);
  const [remoteStreamHealthy, setRemoteStreamHealthy] = useState(false);

  // Prevent multiple joins
  const hasJoinedRef = useRef(false);

  const {
    localVideoRef,
    remoteVideoRef,
    streamReady,
    reconnectStream,
    localStream,
    remoteStream,
  } = useWebRTC(roomId!, true);

  // Calculate ready state from socket users only
  const readyUsers = users.filter((user) => user.isReady);
  const canStart = users.length >= 2 && readyUsers.length === users.length;
  const isReady = currentUser?.isReady || false;

  // Reset join guard on component mount (handles refresh)
  useEffect(() => {
    hasJoinedRef.current = false;
  }, []);

  // AUTO-JOIN room - simplified since SocketContext handles persistence
  useEffect(() => {
    // Only join if we have fresh route data and haven't joined yet
    if (roomId && name && position && !hasJoinedRef.current && !currentRoom) {
      console.log("🚪 Fresh join from route data:", { roomId, name, position });
      hasJoinedRef.current = true;

      joinRoom(roomId, {
        name,
        position: position as "for" | "against",
        isReady: false,
      });
    }
  }, [roomId, name, position, joinRoom, currentRoom]);

  // Stream health monitoring
  useEffect(() => {
    if (localStream) {
      const checkHealth = () => {
        const tracks = localStream.getTracks();
        const healthy = tracks.every((track) => track.readyState === "live");
        setLocalStreamHealthy(healthy);
      };

      checkHealth();
      const interval = setInterval(checkHealth, 2000);
      return () => clearInterval(interval);
    } else {
      setLocalStreamHealthy(false);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      const checkHealth = () => {
        const tracks = remoteStream.getTracks();
        const healthy = tracks.every((track) => track.readyState === "live");
        setRemoteStreamHealthy(healthy);
      };

      checkHealth();
      const interval = setInterval(checkHealth, 2000);
      return () => clearInterval(interval);
    } else {
      setRemoteStreamHealthy(false);
    }
  }, [remoteStream]);

  // FIXED: Only start countdown when BOTH users are ready
  useEffect(() => {
    if (!canStart || isPaused) {
      setSecondsLeft(20); // Reset countdown when not ready
      return;
    }

    console.log("⏰ Starting countdown - both users ready!");

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          console.log("🚀 Navigating to debate");
          navigate(`/debate/${roomId}`, {
            state: { topic, position, name, duration },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canStart, isPaused, navigate, roomId, topic, position, name, duration]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const getCountdownColor = () =>
    secondsLeft <= 5
      ? "text-red-600"
      : secondsLeft <= 10
      ? "text-amber-600"
      : "text-green-600";

  const handleReadyClick = () => {
    console.log("✅ Setting ready state to true");
    setReady(true);
  };

  const handleManualReconnect = () => {
    console.log("Manual reconnect triggered from lobby");
    reconnectStream();
  };

  // Debug display
  const DebugDisplay = () => (
    <div className="fixed top-0 right-0 bg-black text-white p-2 text-xs z-50 max-w-xs">
      <div>Socket Users: {users.length}</div>
      <div>Current Room: {currentRoom || "none"}</div>
      <div>Can Start: {canStart ? "Yes" : "No"}</div>
      <div>
        Ready: {readyUsers.length}/{users.length}
      </div>
      <div>
        Users:{" "}
        {users.map((u) => `${u.name}${u.isReady ? "✅" : "❌"}`).join(", ")}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <DebugDisplay />
      <div className="mx-auto max-w-6xl">
        <div className="text-center my-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Debate Lobby
          </h1>
          <p className="text-slate-600">
            {canStart
              ? "All participants ready!"
              : `Waiting for ${2 - users.length} more participants...`}
          </p>

          {/* Stream status indicator */}
          <div className="mt-2 flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  streamReady && localStreamHealthy
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span>
                Your Camera:{" "}
                {streamReady && localStreamHealthy ? "Ready" : "Not Ready"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  remoteStreamHealthy ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <span>
                Opponent: {remoteStreamHealthy ? "Connected" : "Waiting..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full">
          <Card className="mb-8 flex-1 shadow-xl border-0 bg-white/95 backdrop-blur-sm mr-4">
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
                    <div
                      className={`text-6xl font-bold mb-2 text-white ${getCountdownColor()}`}
                    >
                      {formatTime(secondsLeft)}
                    </div>
                    <p className="text-green-100">
                      Get ready! The debate will begin automatically.
                    </p>
                    <div className="text-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsPaused((prev) => !prev)}
                        className="text-white bg-black/30 hover:bg-black/50"
                      >
                        {isPaused ? "Resume Countdown" : "Pause Countdown"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold mb-2">
                    {readyUsers.length}/{users.length} Ready
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ready button - only show if user exists and isn't ready */}
        {currentUser && !isReady && streamReady && localStreamHealthy && (
          <div className="text-center mb-6">
            <Button
              onClick={handleReadyClick}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> I'm Ready
            </Button>
          </div>
        )}

        {/* Connection issues banner */}
        {(!streamReady || !localStreamHealthy) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Camera connection issues detected. Please check your camera
                permissions.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualReconnect}
                className="ml-auto"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Camera
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* User List */}
          <div className="w-60 bg-gray-100 rounded-lg p-4 space-y-3 shadow-inner">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Users ({users.length})
            </h4>
            <UsersList />

            {/* Debug info */}
            <div className="mt-4 p-2 bg-gray-200 rounded text-xs">
              <div className="font-semibold mb-1">Debug:</div>
              <div>Room: {roomId}</div>
              <div>Current User: {currentUser?.name || "None"}</div>
              <div>Stream Ready: {streamReady ? "✅" : "❌"}</div>
              <div>Local Healthy: {localStreamHealthy ? "✅" : "❌"}</div>
              <div>Remote Connected: {remoteStreamHealthy ? "✅" : "❌"}</div>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Self Video */}
            <div className="bg-white rounded shadow p-4 flex flex-col items-center relative">
              <div className="w-full h-64 bg-black rounded relative overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.error("Local video element error");
                    handleManualReconnect();
                  }}
                />

                {/* Stream health indicator */}
                <div className="absolute top-2 right-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      streamReady && localStreamHealthy
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                    title={
                      streamReady && localStreamHealthy
                        ? "Stream healthy"
                        : "Stream issues"
                    }
                  />
                </div>

                {/* Connection overlay for issues */}
                {(!streamReady || !localStreamHealthy) && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-white text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">Camera not ready</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualReconnect}
                        className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 font-semibold text-slate-800">{name} (You)</p>
            </div>

            {/* Opponent Video or Placeholder */}
            <div className="bg-white rounded shadow p-4 flex flex-col items-center relative">
              <div className="w-full h-64 bg-black rounded relative overflow-hidden">
                {users.length > 1 ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.error("Remote video element error");
                      }}
                    />

                    {/* Remote stream health indicator */}
                    <div className="absolute top-2 right-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          remoteStreamHealthy ? "bg-green-500" : "bg-red-500"
                        }`}
                        title={
                          remoteStreamHealthy
                            ? "Stream healthy"
                            : "Stream issues"
                        }
                      />
                    </div>

                    {/* Connection overlay for remote issues */}
                    {!remoteStreamHealthy && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-white text-center">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                          <p className="text-sm">Opponent disconnected</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for opponent...</p>
                    </div>
                  </div>
                )}
              </div>

              {users.length > 1 && (
                <p className="mt-2 font-semibold text-slate-800">
                  {users.find((u) => u.name !== name)?.name || "Opponent"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
