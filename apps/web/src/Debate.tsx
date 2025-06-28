import {
  AlertCircle,
  Clock,
  Mic,
  MicOff,
  RefreshCw,
  Users,
  VideoIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UsersList from "./components/UsersList";
import { cn } from "./lib/utils";
// import stoneAd from "./assets/stonebanner.png";
import { useDebateState } from "./hooks/useDebateState";
import { useParams } from "react-router-dom";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Debate() {
  const { topic, position, name, duration = 10 } = useDebateState();
  const { roomId } = useParams();

  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [localStreamHealthy, setLocalStreamHealthy] = useState(true);
  const [remoteStreamHealthy, setRemoteStreamHealthy] = useState(true);

  const { turnSpeaker, passTurn, leaveRoom, users } = useSocket();

  const {
    localVideoRef,
    remoteVideoRef,
    setStreamReady,
    reconnectStream,
    localStream,
    remoteStream,
    streamReady,
  } = useWebRTC(roomId!, true);

  // Enhanced media stream initialization
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then(() => {
        setStreamReady(true);
      })
      .catch(() => console.warn("Camera/Mic access denied"));
  }, [setStreamReady]);

  // Stream health monitoring for local stream
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

      // Check immediately and then every 2 seconds
      checkLocalHealth();
      const interval = setInterval(checkLocalHealth, 2000);

      return () => clearInterval(interval);
    }
  }, [localStream]);

  // Stream health monitoring for remote stream
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

      // Check immediately and then every 2 seconds
      checkRemoteHealth();
      const interval = setInterval(checkRemoteHealth, 2000);

      return () => clearInterval(interval);
    }
  }, [remoteStream]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleManualReconnect = () => {
    console.log("Manual reconnect triggered");
    reconnectStream();
  };

  const renderVideoBlock = (
    role: "for" | "against",
    ref: React.RefObject<HTMLVideoElement | null>
  ) => {
    const isActive = turnSpeaker === role;
    const isSelf = position === role;
    const label = role.toUpperCase();
    const labelName = isSelf
      ? name
      : users.find((u) => u.position === role && u.name !== name)?.name ||
        "Waiting...";

    // Determine stream health based on role
    const isStreamHealthy = isSelf ? localStreamHealthy : remoteStreamHealthy;

    if (ref)
      return (
        <div
          className={cn(
            isActive ? "w-4/5" : "w-1/5",
            "h-full",
            isActive ? "relative" : "absolute bottom-5 right-5",
            isActive ? "border-none" : "border-2 border-white",
            "rounded-lg",
            "transition-all duration-300 ease-in-out",
            isActive ? "shadow-none" : "shadow-lg shadow-black/70",
            "bg-black",
            "overflow-hidden",
            isActive ? "z-[1]" : "z-[10]"
          )}
        >
          <video
            ref={ref}
            autoPlay
            muted={isSelf || isMuted}
            playsInline
            className="w-full h-full object-cover rounded-lg"
            onError={() => {
              console.error(`${isSelf ? "Local" : "Remote"} video error`);
              if (isSelf) {
                handleManualReconnect();
              }
            }}
          />

          {/* Stream health indicator */}
          <div className="absolute top-2 right-2 flex gap-2 items-center">
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                isStreamHealthy ? "bg-green-500" : "bg-red-500"
              )}
              title={isStreamHealthy ? "Stream healthy" : "Stream issues"}
            />

            {!isStreamHealthy && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualReconnect}
                className="text-xs bg-white/80 hover:bg-white/90 text-black border-white/50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Fix
              </Button>
            )}
          </div>

          {/* Connection status overlay for unhealthy streams */}
          {!isStreamHealthy && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm">Stream disconnected</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualReconnect}
                  className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reconnect
                </Button>
              </div>
            </div>
          )}

          {/* {!isActive && (
            <div className="absolute bottom-0 w-full h-1/2 bg-lime-400 z-[1000] flex items-center justify-center opacity-80">
              <img
                src={stoneAd}
                alt="Stone Ad"
                className="max-w-full max-h-full object-contain border-2 border-white rounded"
              />
            </div>
          )} */}

          <div
            className={cn(
              "absolute bottom-0 w-full text-white px-2 py-1 rounded-b-lg font-semibold text-center text-sm",
              turnSpeaker === role
                ? role === "for"
                  ? "bg-blue-600/80"
                  : "bg-red-500/80"
                : role === "for"
                ? "bg-blue-600/20"
                : "bg-red-500/20"
            )}
          >
            {label}: {labelName}
          </div>
        </div>
      );
  };

  if (localVideoRef && remoteVideoRef)
    return (
      <div className="relative p-8 space-y-6 w-full h-[calc(100dvh-65px)] overflow-auto overflow-x-hidden">
        <Card className="border-none shadow-lg max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Debate in Progress
            </CardTitle>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex gap-1 p-2 rounded-md shadow-xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <Clock className="w-4 h-4" />
                {formatTime(elapsed)}
              </div>
              <div className="p-2 rounded-md flex items-center gap-2">
                <VideoIcon />
                <Badge
                  variant={turnSpeaker === "for" ? "default" : "secondary"}
                >
                  Current: {turnSpeaker.toUpperCase()}
                </Badge>
                {duration && (
                  <Badge variant="outline">
                    Duration: {Math.floor(duration / 60)}m
                  </Badge>
                )}
                {/* Stream ready indicator */}
                <Badge
                  variant={
                    streamReady && localStreamHealthy && remoteStreamHealthy
                      ? "default"
                      : "destructive"
                  }
                  className="ml-2"
                >
                  {streamReady && localStreamHealthy && remoteStreamHealthy
                    ? "🟢 Connected"
                    : "🔴 Connection Issues"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6 text-lg">
              <strong>Topic:</strong> {topic || "No topic specified"}
            </p>

            {/* Connection status banner */}
            {(!localStreamHealthy || !remoteStreamHealthy) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Connection issues detected.
                    {!localStreamHealthy && " Your stream is disconnected."}
                    {!remoteStreamHealthy &&
                      " Opponent's stream is disconnected."}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualReconnect}
                    className="ml-auto"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reconnect All
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-6">
              <div className="flex-1 relative h-96 flex items-stretch bg-gray-900 rounded-lg overflow-hidden">
                {renderVideoBlock("for", localVideoRef)}
                {renderVideoBlock("against", remoteVideoRef)}
              </div>

              <div className="w-60 bg-gray-100 rounded-lg p-4 space-y-3 shadow-inner">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Users List
                </h4>
                <UsersList />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                onClick={passTurn}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Pass Turn
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center gap-2"
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>

              <Button
                variant="outline"
                onClick={handleManualReconnect}
                className="flex items-center gap-2"
                disabled={localStreamHealthy && remoteStreamHealthy}
              >
                <RefreshCw className="w-4 h-4" />
                Reconnect Streams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}

export default Debate;
