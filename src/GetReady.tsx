import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Mic,
  User,
  Video,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GetReady() {
  const [name, setName] = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, position } = location.state || { topic: "", position: "" };

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
        setStreamError(true);
        console.log("Camera/Mic access denied");
      });
  }, []);

  const handleContinue = () => {
    navigate(`/lobby/${roomId}`, {
      state: {
        name,
        topic,
        position,
      },
    });
  };

  const isFormValid = name.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Get Ready</h1>
          <p className="text-slate-600">
            Set up your camera and microphone before joining
          </p>
        </div>

        {/* Room Info Card */}
        <Card className="mb-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-slate-900">
              Debate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Room ID:</span>
              <Badge variant="outline" className="font-mono text-sm">
                {roomId}
              </Badge>
            </div>
            {topic && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Topic:</span>
                <span className="text-sm font-medium text-slate-900 text-right max-w-xs truncate">
                  {topic}
                </span>
              </div>
            )}
            {position && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Your Position:</span>
                <Badge
                  variant="secondary"
                  className={`${
                    position === "for"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-1 ${
                      position === "for" ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  {position === "for" ? "For" : "Against"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="w-5 h-5 text-indigo-600" />
              Setup Your Profile
            </CardTitle>
            <CardDescription>
              Enter your name and test your camera and microphone
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
                className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <Separator className="bg-slate-200" />

            {/* Camera Preview */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-600" />
                <Label className="text-sm font-medium text-slate-700">
                  Camera Preview
                </Label>
                {streamReady && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-800"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {streamError && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-red-100 text-red-800"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg bg-slate-100 border border-slate-200"
                  style={{ aspectRatio: "16/9" }}
                />
                {streamError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        Camera access denied
                      </p>
                      <p className="text-xs text-slate-500">
                        Please allow camera access and refresh
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Microphone Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600" />
                <Label className="text-sm font-medium text-slate-700">
                  Microphone
                </Label>
                {streamReady && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-800"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm text-slate-600">
                  {streamReady
                    ? "Microphone is ready. Speak to test your audio levels."
                    : "Microphone setup in progress..."}
                </p>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!isFormValid}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Lobby
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Video className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-slate-900">
                  Before you continue
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Make sure your camera and microphone are working properly.
                  You'll be joining other participants in the lobby where you
                  can chat before the debate begins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GetReady;
