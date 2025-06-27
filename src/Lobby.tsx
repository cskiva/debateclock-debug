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
import { useLocation, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";

function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, position, name, duration } = location.state || {
    topic: "",
    position: "",
    name: "",
    duration: 10,
  };

  const [secondsLeft, setSecondsLeft] = useState(20);
  const [streamReady, setStreamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamReady(true);
        }
      })
      .catch(() => {
        console.log("Camera/Mic access denied");
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Navigate to debate page when countdown ends
          navigate(`/debate/${topic}`, {
            state: { topic, position, name, duration },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, topic, position, name, duration]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Debate Lobby
          </h1>
          <p className="text-slate-600">Preparing your debate room...</p>
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
        <Card className="mb-8 shadow-xl border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-6 h-6" />
                <span className="text-lg font-medium">Starting in</span>
              </div>
              <div
                className={`text-6xl font-bold mb-2 ${getCountdownColor()} text-white`}
              >
                {formatTime(secondsLeft)}
              </div>
              <p className="text-indigo-100">
                Get ready! The debate will begin automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* FOR Position */}
          <Card
            className={`shadow-xl border-0 overflow-hidden ${
              position === "for"
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
                {position === "for" && streamReady && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {position === "for" && !streamReady && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Connecting
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video mb-4">
                {position === "for" ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
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
                      <p className="text-sm">Waiting for participant...</p>
                    </div>
                  </div>
                )}

                {/* Lower Third */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">
                      {position === "for" ? name : "Waiting..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AGAINST Position */}
          <Card
            className={`shadow-xl border-0 overflow-hidden ${
              position === "against"
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
                {position === "against" && streamReady && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {position === "against" && !streamReady && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Connecting
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video mb-4">
                {position === "against" ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
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
                      <p className="text-sm">Waiting for participant...</p>
                    </div>
                  </div>
                )}

                {/* Lower Third */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-white font-medium">
                      {position === "against" ? name : "Waiting..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
