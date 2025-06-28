import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import UsersList from "./components/UsersList";
import { useDebateState } from "./hooks/useDebateState";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Lobby() {
  const navigate = useNavigate();
  const {
    topic,
    position,
    name,
    duration = 10,
    users,
    currentUser,
    setReady,
  } = useDebateState();

  const location = useLocation();
  const { roomId } = useParams();
  const { joinRoom, leaveRoom } = useSocket();

  const { isHost = true } = location.state || {};

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);

  const {
    localVideoRef,
    remoteVideoRef,
    streamReady,
    setStreamReady,
    reconnectStream,
    localStream,
    remoteStream,
  } = useWebRTC(roomId!, true);

  const [localStreamHealthy, setLocalStreamHealthy] = useState(true);
  const [remoteStreamHealthy, setRemoteStreamHealthy] = useState(true);

  // Add stream health monitoring
  useEffect(() => {
    if (localStream) {
      const checkLocalHealth = () => {
        const tracks = localStream.getTracks();
        const healthy = tracks.every((track) => track.readyState === "live");
        setLocalStreamHealthy(healthy);

        if (!healthy) {
          console.warn(
            "Local stream unhealthy, tracks:",
            tracks.map((t) => `${t.kind}: ${t.readyState}`)
          );
        }
      };

      const interval = setInterval(checkLocalHealth, 2000);
      return () => clearInterval(interval);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      const checkRemoteHealth = () => {
        const tracks = remoteStream.getTracks();
        const healthy = tracks.every((track) => track.readyState === "live");
        setRemoteStreamHealthy(healthy);

        if (!healthy) {
          console.warn(
            "Remote stream unhealthy, tracks:",
            tracks.map((t) => `${t.kind}: ${t.readyState}`)
          );
        }
      };

      const interval = setInterval(checkRemoteHealth, 2000);
      return () => clearInterval(interval);
    }
  }, [remoteStream]);

  const handleManualReconnect = () => {
    console.log("Manual reconnect triggered");
    reconnectStream();
  };

  const readyUsers = users.filter((user) => user.isReady);
  const canStart = users.length >= 2 && readyUsers.length === users.length;
  const isReady = currentUser?.isReady;

  // Get webcam stream
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(() => {
        setStreamReady(true);
      })
      .catch(() => {
        console.warn("Camera/Mic access denied");
      });
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!canStart || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
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
    if (!isHost && name) {
      joinRoom(roomId!, { name, position: position as "for" | "against" });
    }
    setReady(true);
  };

  useEffect(() => {
    return () => {
      leaveRoom(); // this will emit the leave event and clean up
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center my-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Debate Lobby
          </h1>
          <p className="text-slate-600">
            {canStart
              ? "All participants ready!"
              : isHost
              ? "Waiting for participants..."
              : "Waiting for Host..."}
          </p>
        </div>
        <div className="flex w-full bg-red-500">
          <Card className="mb-8 flex-1 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
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
          {!isReady && streamReady && !canStart && (
            <div className="text-center mb-6">
              <Button
                onClick={handleReadyClick}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> I'm Ready
              </Button>
            </div>
          )}
        </div>

        <div className="flex">
          {/* User List */}
          <div className="w-60 bg-gray-100 rounded-lg p-4 space-y-3 shadow-inner">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              Users
            </h4>
            <UsersList />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {/* Self Video - Updated */}
            <div className="bg-white rounded shadow p-4 flex flex-col items-center relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-64 bg-black rounded"
              />
              <p className="mt-2 font-semibold text-slate-800">{name} (You)</p>

              {/* Stream health indicator */}
              <div className="absolute top-2 right-2 flex gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    localStreamHealthy ? "bg-green-500" : "bg-red-500"
                  }`}
                  title={
                    localStreamHealthy ? "Stream healthy" : "Stream issues"
                  }
                />
                {!localStreamHealthy && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualReconnect}
                    className="text-xs"
                  >
                    Reconnect
                  </Button>
                )}
              </div>
            </div>

            {/* Opponent Video - Updated */}
            <div className="bg-white rounded shadow p-4 flex flex-col items-center justify-center relative">
              {users.length > 1 ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded"
                  />
                  <p className="mt-2 font-semibold text-slate-800">
                    {users.find((u) => u.id !== currentUser?.id)?.name ||
                      "Opponent"}
                  </p>

                  {/* Remote stream health indicator */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        remoteStreamHealthy ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={
                        remoteStreamHealthy ? "Stream healthy" : "Stream issues"
                      }
                    />
                    {!remoteStreamHealthy && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualReconnect}
                        className="text-xs"
                      >
                        Fix Stream
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
                  <p className="text-gray-600">Waiting for opponent...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
