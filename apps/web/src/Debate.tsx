import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Mic,
  MicOff,
  Settings,
  Users,
  VideoIcon,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "./lib/utils";
import stoneAd from "./assets/stonebanner.png";
import { useLocation } from "react-router-dom";

function Debate() {
  const location = useLocation();
  const { topic, position, name, duration } = location.state || {};

  const [elapsed, setElapsed] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<"for" | "against">("for");
  const [isMuted, setIsMuted] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);

  const videoRefFor = useRef<HTMLVideoElement>(null);
  const videoRefAgainst = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (position === "for" && videoRefFor.current) {
          videoRefFor.current.srcObject = stream;
        } else if (position === "against" && videoRefAgainst.current) {
          videoRefAgainst.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera/Mic access denied"));
  }, [position]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  function renderVideoBlock(
    role: "for" | "against",
    ref: React.RefObject<HTMLVideoElement | null>
  ) {
    const isActive = activeSpeaker === role;
    const isSelf = position === role;
    const label = role.toUpperCase();
    const labelName = isSelf ? name : "Waiting...";

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
            muted={isMuted}
            className="w-full h-full object-cover rounded-lg"
          />
          {!isActive && (
            <div className="absolute bottom-0 w-full h-1/2 bg-lime-400 z-[1000] flex items-center justify-center opacity-80">
              <img
                src={stoneAd}
                alt="Stone Ad"
                className="max-w-full max-h-full object-contain border-2 border-white rounded"
              />
            </div>
          )}
          <div
            className={`
            absolute bottom-0 w-full 
            ${
              activeSpeaker === role
                ? role === "for"
                  ? "bg-blue-600/80"
                  : "bg-red-500/80"
                : role === "for"
                ? "bg-blue-600/20"
                : "bg-red-500/20"
            }
            text-white px-2 py-1 rounded-b-lg font-semibold text-center text-sm
          `}
          >
            {label}: {labelName}
          </div>
        </div>
      );
    else return null;
  }

  // Debug data - only show in development
  const isDebug = process.env.NODE_ENV === "development";

  const debugData = {
    topic,
    position,
    name,
    duration,
    elapsed,
    activeSpeaker,
    isMuted,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    location: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
    },
    videoRefs: {
      forConnected: !!videoRefFor.current?.srcObject,
      againstConnected: !!videoRefAgainst.current?.srcObject,
    },
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

            <div className={cn("p-2 rounded-md flex")}>
              <VideoIcon />
              <Badge
                variant={activeSpeaker === "for" ? "default" : "secondary"}
              >
                Current: {activeSpeaker.toUpperCase()}
              </Badge>
              {duration && (
                <Badge variant="outline">
                  Duration: {Math.floor(duration / 60)}m
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-6 text-lg">
            <strong>Topic:</strong> {topic || "No topic specified"}
          </p>

          <div className="relative h-96 flex items-stretch bg-gray-900 rounded-lg overflow-hidden">
            {renderVideoBlock("for", videoRefFor)}
            {renderVideoBlock("against", videoRefAgainst)}
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() =>
                setActiveSpeaker(activeSpeaker === "for" ? "against" : "for")
              }
              className="flex items-center gap-2"
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

            {isDebug && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDebugVisible(!debugVisible)}
                className="flex items-center gap-2 text-yellow-600"
              >
                <Settings className="w-4 h-4" />
                Debug
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel - Only in Development */}
      {isDebug && debugVisible && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              🐛 Debug Information
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugVisible(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Position:</strong> {position || "Not set"}
                </div>
                <div>
                  <strong>Name:</strong> {name || "Not set"}
                </div>
                <div>
                  <strong>Active Speaker:</strong> {activeSpeaker}
                </div>
                <div>
                  <strong>Elapsed:</strong> {formatTime(elapsed)}
                </div>
              </div>

              <details className="bg-black/10 rounded p-2">
                <summary className="cursor-pointer font-semibold">
                  Full Debug Data
                </summary>
                <pre className="text-xs bg-black text-green-400 p-4 rounded mt-2 overflow-auto max-h-64">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Debate;
