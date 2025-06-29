import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useDebateState } from "./_context/DebateContext";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Lobby() {
  const navigate = useNavigate();
  const { topic, duration = 10, me, setReady } = useDebateState();

  const { users } = useSocket();

  const { roomId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isHost = queryParams.get("host") === "true";

  const { leaveRoom } = useSocket();
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);

  const { localVideoRef, remoteVideoRef, streamReady, setStreamReady } =
    useWebRTC(roomId!, isHost);

  const readyUsers = users.filter((user) => user.isReady);
  const canStart = users.length >= 2 && readyUsers.length === users.length;
  const isReady = me?.isReady;

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

  useEffect(() => {
    if (!canStart || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Defer navigation to avoid React state update in render phase
          setTimeout(() => {
            navigate(`/debate/${roomId}`);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canStart, isPaused, navigate, roomId, topic, duration]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const getCountdownColor = () =>
    secondsLeft <= 5
      ? "text-red-600"
      : secondsLeft <= 10
      ? "text-amber-600"
      : "text-green-600";

  const handleReadyClick = () => {
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
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
        <p>Socket State Users</p>
        <p>{JSON.stringify(users)}</p>
      </div>

      <div className="mx-auto max-w-6xl">
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

        {!isReady && streamReady && (
          <div className="text-center mb-6">
            <Button
              onClick={handleReadyClick}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> I'm Ready
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-8">
          {/* Self Video */}
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-64 bg-black rounded"
            />
            <p className="mt-2 font-semibold text-slate-800">
              {me?.name} (You)
              {JSON.stringify(me)}
            </p>
          </div>

          {/* Opponent Video or Placeholder */}
          <div className="bg-white rounded shadow p-4 flex flex-col items-center justify-center h-64">
            {users.length > 1 ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  className="w-full h-64 bg-black rounded"
                />
                <p className="mt-2 font-semibold text-slate-800">
                  {users.find((u) => u.id !== me?.id)?.name || "Opponent"}
                </p>
              </>
            ) : (
              <p className="text-slate-500 mb-4">Waiting for opponent...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
