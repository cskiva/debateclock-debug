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
import { useDebateState } from "./hooks/useDebateState";
import { useParams } from "react-router-dom";
import { useSocket } from "./_context/SocketContext";
import { useWebRTC } from "./hooks/useWebRTC";

function Debate() {
  const { topic, position, name, duration = 10 } = useDebateState();
  const { roomId } = useParams();

  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [localStreamHealthy, setLocalStreamHealthy] = useState(false); // Start as false until confirmed
  const [remoteStreamHealthy, setRemoteStreamHealthy] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    localStreamTracks: 0,
    remoteStreamTracks: 0,
    localVideoElement: false,
    remoteVideoElement: false,
    webRTCState: "initializing",
  });

  const { turnSpeaker, passTurn, leaveRoom, users } = useSocket();

  const {
    localVideoRef,
    remoteVideoRef,
    reconnectStream,
    localStream,
    remoteStream,
    streamReady,
  } = useWebRTC(roomId!, true);

  // Enhanced debug logging
  useEffect(() => {
    console.log("🎯 Debate Component State:", {
      roomId,
      name,
      position,
      usersCount: users.length,
      streamReady,
      localStream: !!localStream,
      remoteStream: !!remoteStream,
      localVideoRef: !!localVideoRef?.current,
      remoteVideoRef: !!remoteVideoRef?.current,
    });
  }, [
    roomId,
    name,
    position,
    users.length,
    streamReady,
    localStream,
    remoteStream,
  ]);

  // Debug info updater
  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        localStreamTracks: localStream?.getTracks()?.length || 0,
        remoteStreamTracks: remoteStream?.getTracks()?.length || 0,
        localVideoElement: !!localVideoRef?.current,
        remoteVideoElement: !!remoteVideoRef?.current,
        webRTCState: streamReady ? "ready" : "not-ready",
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [localStream, remoteStream, localVideoRef, remoteVideoRef, streamReady]);

  // Enhanced stream assignment and monitoring
  useEffect(() => {
    if (localStream && localVideoRef?.current) {
      console.log("🎥 Assigning local stream to video element:", {
        streamId: localStream.id,
        tracks: localStream
          .getTracks()
          .map((t) => `${t.kind}: ${t.readyState}`),
        videoElement: !!localVideoRef.current,
      });

      try {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch((e) => {
          console.error("Local video play failed:", e);
        });
      } catch (error) {
        console.error("Error assigning local stream:", error);
      }
    }
  }, [localStream, localVideoRef]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef?.current) {
      console.log("🎥 Assigning remote stream to video element:", {
        streamId: remoteStream.id,
        tracks: remoteStream
          .getTracks()
          .map((t) => `${t.kind}: ${t.readyState}`),
        videoElement: !!remoteVideoRef.current,
      });

      try {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => {
          console.error("Remote video play failed:", e);
        });
      } catch (error) {
        console.error("Error assigning remote stream:", error);
      }
    }
  }, [remoteStream, remoteVideoRef]);

  // Stream health monitoring for local stream
  useEffect(() => {
    if (localStream) {
      const checkLocalHealth = () => {
        const tracks = localStream.getTracks();
        const healthy =
          tracks.length > 0 &&
          tracks.every((track) => track.readyState === "live");

        console.log("🏥 Local stream health check:", {
          healthy,
          tracksCount: tracks.length,
          tracks: tracks.map((t) => `${t.kind}: ${t.readyState}`),
        });

        setLocalStreamHealthy(healthy);

        if (!healthy) {
          console.warn(
            "Local stream unhealthy, tracks:",
            tracks.map((t) => `${t.kind}: ${t.readyState}`)
          );
        }
      };

      checkLocalHealth();
      const interval = setInterval(checkLocalHealth, 2000);
      return () => clearInterval(interval);
    } else {
      setLocalStreamHealthy(false);
    }
  }, [localStream]);

  // Stream health monitoring for remote stream
  useEffect(() => {
    if (remoteStream) {
      const checkRemoteHealth = () => {
        const tracks = remoteStream.getTracks();
        const healthy =
          tracks.length > 0 &&
          tracks.every((track) => track.readyState === "live");

        console.log("🏥 Remote stream health check:", {
          healthy,
          tracksCount: tracks.length,
          tracks: tracks.map((t) => `${t.kind}: ${t.readyState}`),
        });

        setRemoteStreamHealthy(healthy);

        if (!healthy) {
          console.warn(
            "Remote stream unhealthy, tracks:",
            tracks.map((t) => `${t.kind}: ${t.readyState}`)
          );
        }
      };

      checkRemoteHealth();
      const interval = setInterval(checkRemoteHealth, 2000);
      return () => clearInterval(interval);
    } else {
      setRemoteStreamHealthy(false);
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
    console.log("🔄 Manual reconnect triggered");
    reconnectStream();
  };

  // Test getUserMedia directly
  const testDirectStream = async () => {
    try {
      console.log("🧪 Testing direct getUserMedia...");
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("✅ Direct getUserMedia successful:", {
        id: testStream.id,
        tracks: testStream.getTracks().map((t) => `${t.kind}: ${t.readyState}`),
      });

      // Assign to local video for testing
      if (localVideoRef?.current) {
        localVideoRef.current.srcObject = testStream;
        localVideoRef.current.play();
      }

      // Stop test stream after 5 seconds
      setTimeout(() => {
        testStream.getTracks().forEach((track) => track.stop());
        console.log("🛑 Test stream stopped");
      }, 5000);
    } catch (error) {
      console.error("❌ Direct getUserMedia failed:", error);
    }
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
    const hasStream = isSelf ? !!localStream : !!remoteStream;

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
          onLoadedMetadata={() => {
            console.log(
              `📹 ${isSelf ? "Local" : "Remote"} video metadata loaded`
            );
          }}
          onCanPlay={() => {
            console.log(`▶️ ${isSelf ? "Local" : "Remote"} video can play`);
          }}
          onError={(e) => {
            console.error(`❌ ${isSelf ? "Local" : "Remote"} video error:`, e);
            if (isSelf) {
              handleManualReconnect();
            }
          }}
        />

        {/* Stream status indicator - more detailed */}
        <div className="absolute top-2 right-2 flex gap-2 items-center">
          <div className="bg-black/60 px-2 py-1 rounded text-white text-xs">
            {hasStream
              ? isStreamHealthy
                ? "🟢 Live"
                : "🟡 Issues"
              : "🔴 No Stream"}
          </div>

          {!isStreamHealthy && hasStream && (
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
        {!hasStream && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <p className="text-sm">No stream detected</p>
              <p className="text-xs text-gray-300 mb-2">
                {isSelf ? "Camera not initialized" : "Waiting for opponent"}
              </p>
              {isSelf && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualReconnect}
                  className="mt-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Initialize Camera
                </Button>
              )}
            </div>
          </div>
        )}

        {!isStreamHealthy && hasStream && (
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
              <Badge variant={turnSpeaker === "for" ? "default" : "secondary"}>
                Current: {turnSpeaker.toUpperCase()}
              </Badge>
              {duration && (
                <Badge variant="outline">
                  Duration: {Math.floor(duration / 60)}m
                </Badge>
              )}
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

          {/* Enhanced connection status banner */}
          {(!localStream || !localStreamHealthy || !remoteStreamHealthy) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {!localStream && "Camera not initialized. "}
                  {!localStreamHealthy &&
                    localStream &&
                    "Your stream has issues. "}
                  {!remoteStreamHealthy && "Opponent's stream has issues."}
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
                Users ({users.length})
              </h4>
              <UsersList />

              {/* Enhanced debug info */}
              <div className="mt-4 p-2 bg-gray-200 rounded text-xs space-y-1">
                <div className="font-semibold mb-1">Debug Info:</div>
                <div>Room: {roomId}</div>
                <div>Users: {users.length}</div>
                <div>Name: {name}</div>
                <div>Position: {position}</div>
                <div>WebRTC: {debugInfo.webRTCState}</div>
                <div>
                  Local Stream: {localStream ? "✅" : "❌"} (
                  {debugInfo.localStreamTracks} tracks)
                </div>
                <div>
                  Remote Stream: {remoteStream ? "✅" : "❌"} (
                  {debugInfo.remoteStreamTracks} tracks)
                </div>
                <div>
                  Local Video Element:{" "}
                  {debugInfo.localVideoElement ? "✅" : "❌"}
                </div>
                <div>
                  Remote Video Element:{" "}
                  {debugInfo.remoteVideoElement ? "✅" : "❌"}
                </div>
                <div>Local Healthy: {localStreamHealthy ? "✅" : "❌"}</div>
                <div>Remote Healthy: {remoteStreamHealthy ? "✅" : "❌"}</div>

                <Button
                  size="sm"
                  onClick={testDirectStream}
                  className="w-full mt-2 text-xs"
                  variant="outline"
                >
                  Test Direct Camera
                </Button>
              </div>
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
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Streams
            </Button>

            <Button
              variant="outline"
              onClick={testDirectStream}
              className="flex items-center gap-2"
            >
              <VideoIcon className="w-4 h-4" />
              Test Camera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Debate;
