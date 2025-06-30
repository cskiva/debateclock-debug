import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Crown, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useDebateState } from "./_context/DebateContext";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Lobby() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isHost = queryParams.get("host") === "true";

  // ✅ Get debate state with new schema data
  const {
    debate,
    me,
    loading: contextLoading,
    error: contextError,
    setRoomId,
    manuallyJoinRoom,
    dbParticipants, // New: database participants
  } = useDebateState();

  const { users, leaveRoom, isConnected, setReady } = useSocket();

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);

  const { localVideoRef, remoteVideoRef, streamReady, setStreamReady } =
    useWebRTC(roomId!, isHost);

  // Ensure room ID is set in context when we navigate to lobby
  useEffect(() => {
    if (roomId && !debate?.room_id) {
      console.log("🔧 Setting room ID in context:", roomId);
      setRoomId(roomId);
    }
  }, [roomId, debate, setRoomId]);

  // Auto-join room if we have user data but aren't connected
  useEffect(() => {
    if (me && roomId && isConnected && users.length === 0) {
      console.log("🔄 Lobby: Auto-joining room because no users found");
      manuallyJoinRoom();
    }
  }, [me, roomId, isConnected, users.length, manuallyJoinRoom]);

  // Calculate ready state from socket users (real-time data)
  const readyUsers = users.filter((user) => user.isReady);
  const totalUsers = users.length;
  const readyCount = readyUsers.length;
  const canStart = totalUsers >= 2 && readyCount === totalUsers;

  // Check if current user is ready (from socket users, not local me state)
  const currentSocketUser = users.find((u) => u.id === me?.id);
  const isReady = currentSocketUser?.isReady || false;

  // ✅ Get debate info from new schema
  const topic = debate?.topic || "Loading topic...";
  const duration = debate?.duration || 10;
  const hostName = debate?.host_name || (isHost ? me?.name : "Unknown Host");
  const debateStatus = debate?.status || "waiting";

  // ✅ Use database participants for additional info
  const connectedDbParticipants = dbParticipants.filter(
    (p) => p.peer_connection_status === "connected"
  );
  const hostParticipant = dbParticipants.find((p) => p.is_host);

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
  }, [setStreamReady]);

  useEffect(() => {
    if (!canStart || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            navigate(`/debate/${roomId}`);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canStart, isPaused, navigate, roomId]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const getCountdownColor = () =>
    secondsLeft <= 5
      ? "text-red-600"
      : secondsLeft <= 10
      ? "text-amber-600"
      : "text-green-600";

  const handleReadyClick = () => {
    console.log("🎯 Ready button clicked, current state:", {
      isReady,
      currentSocketUser,
      me,
    });
    setReady(true);
  };

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  // Debug info
  useEffect(() => {
    console.log("🏛️ Lobby Debug Info:", {
      roomId,
      debate: !!debate,
      me: me?.name,
      socketUsers: users.length,
      dbParticipants: dbParticipants.length,
      readyUsers: readyCount,
      totalUsers,
      canStart,
      isConnected,
      contextLoading,
      contextError,
      topic,
      hostName,
      debateStatus,
      currentSocketUser,
      isReady,
    });
  }, [
    roomId,
    debate,
    me,
    users.length,
    dbParticipants.length,
    readyCount,
    totalUsers,
    canStart,
    isConnected,
    contextLoading,
    contextError,
    topic,
    hostName,
    debateStatus,
    currentSocketUser,
    isReady,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      {/* ✅ Enhanced Debug Info with new schema data */}
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4 text-sm">
        <p>
          <strong>Debug Info:</strong>
        </p>
        <p>Room ID: {roomId}</p>
        <p>Debate loaded: {debate ? "✅" : "❌"}</p>
        <p>Debate status: {debateStatus}</p>
        <p>Me: {me ? `${me.name} (${me.position})` : "❌ Not set"}</p>
        <p>Socket connected: {isConnected ? "✅" : "❌"}</p>
        <p>Socket users: {totalUsers}</p>
        <p>DB participants: {dbParticipants.length}</p>
        <p>Connected DB participants: {connectedDbParticipants.length}</p>
        <p>
          Ready users: {readyCount}/{totalUsers}
        </p>
        <p>Can start: {canStart ? "✅" : "❌"}</p>
        <p>My ready state: {isReady ? "✅" : "❌"}</p>
        <p>Context loading: {contextLoading ? "⏳" : "✅"}</p>
        <p>Context error: {contextError || "None"}</p>
        <p>Host: {hostParticipant?.name || hostName}</p>

        {users.length > 0 && (
          <div className="mt-2 p-2 bg-blue-100 rounded">
            <p>
              <strong>Socket Users:</strong>
            </p>
            <div className="text-xs space-y-1">
              {users.map((user, index) => (
                <div key={user.id}>
                  {index + 1}. {user.name} ({user.position}) -{" "}
                  {user.isReady ? "✅ Ready" : "❌ Not Ready"}
                </div>
              ))}
            </div>
          </div>
        )}

        {dbParticipants.length > 0 && (
          <div className="mt-2 p-2 bg-purple-100 rounded">
            <p>
              <strong>DB Participants:</strong>
            </p>
            <div className="text-xs space-y-1">
              {dbParticipants.map((participant, index) => (
                <div key={participant.id}>
                  {index + 1}. {participant.name} ({participant.position}) -
                  {participant.is_host && " 👑 Host"} -
                  {participant.peer_connection_status} -
                  {participant.is_ready ? "✅ Ready" : "❌ Not Ready"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Debate Lobby
          </h1>
          <p className="text-slate-600">
            {canStart
              ? "All participants ready!"
              : `Waiting for participants... (${totalUsers}/2 joined)`}
          </p>

          {/* ✅ Show debate status */}
          <div className="mt-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                debateStatus === "waiting"
                  ? "bg-yellow-100 text-yellow-800"
                  : debateStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : debateStatus === "completed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              Status: {debateStatus}
            </span>
          </div>

          {contextLoading && (
            <p className="text-amber-600 mt-2">⏳ Loading debate info...</p>
          )}

          {contextError && (
            <p className="text-red-600 mt-2">❌ Error: {contextError}</p>
          )}
        </div>

        {/* Debate Topic Card */}
        <Card className="mb-8 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-indigo-600" />
              Debate Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-900 leading-relaxed mb-2">
              {topic}
            </p>
            {hostName && (
              <p className="text-sm text-slate-600 flex items-center gap-1">
                <Crown className="w-4 h-4" />
                Hosted by: <strong>{hostName}</strong>
                {hostParticipant && (
                  <span className="text-xs text-slate-500">
                    ({hostParticipant.position})
                  </span>
                )}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Room ID: {roomId} • Duration: {duration} minutes
            </p>
          </CardContent>
        </Card>

        {/* Countdown/Status Card */}
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
                <>
                  <div className="text-2xl font-bold mb-2">
                    {readyCount}/{totalUsers} Ready
                  </div>
                  {totalUsers < 2 && (
                    <p className="text-amber-100 text-sm">
                      Need at least 2 participants to start
                    </p>
                  )}
                  {totalUsers >= 2 && readyCount < totalUsers && (
                    <p className="text-amber-100 text-sm">
                      Waiting for all participants to be ready
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ready Button */}
        {!isReady && streamReady && me && totalUsers > 0 && (
          <div className="text-center mb-6">
            <Button
              onClick={handleReadyClick}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> I'm Ready
            </Button>
          </div>
        )}

        {/* Already Ready State */}
        {isReady && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                You're ready! Waiting for others...
              </span>
            </div>
          </div>
        )}

        {/* Video Grid */}
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
              {me?.name || "You"} (You)
            </p>
            {me && (
              <p className="text-xs text-slate-600">
                Position: {me.position} | Ready: {isReady ? "✅" : "❌"}
              </p>
            )}
          </div>

          {/* Opponent Video or Placeholder */}
          <div className="bg-white rounded shadow p-4 flex flex-col items-center justify-center">
            {totalUsers > 1 ? (
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
              <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-slate-500">Waiting for opponent...</p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Enhanced Participants List with DB data */}
        {totalUsers > 0 && (
          <Card className="mt-6 bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({totalUsers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => {
                  const dbParticipant = dbParticipants.find(
                    (p) => p.name === user.name && p.position === user.position
                  );
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            user.position === "for"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium flex items-center gap-1">
                          {user.name}
                          {dbParticipant?.is_host && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </span>
                        <span className="text-sm text-slate-600">
                          ({user.position})
                        </span>
                        {user.id === me?.id && (
                          <span className="text-xs text-blue-600 font-medium">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.isReady ? (
                          <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-amber-600 text-sm flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Not Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Lobby;
