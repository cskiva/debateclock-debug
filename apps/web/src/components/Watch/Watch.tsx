import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, VideoOff } from "lucide-react";

import { useEffect } from "react";
// pages/WatchPage.tsx
import { useParams } from "react-router-dom";
import { useSocket } from "@/_context/SocketContext";

export default function WatchPage() {
  const { roomId } = useParams();
  const { users, joinRoom, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected && roomId) {
      // Join as viewer, not a participant — no user data sent
      joinRoom(roomId, { name: "Viewer", position: "for" }); // dummy, won't be shown
    }
  }, [isConnected, joinRoom, roomId]);

  // Find debaters
  const forUser = users.find((u) => u.position === "for");
  const againstUser = users.find((u) => u.position === "against");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Live Debate Viewer
          </h1>
          <p className="text-slate-600">
            Room: <span className="font-mono">{roomId}</span>
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Participants</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            {/* FOR */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
              {forUser ? (
                <video autoPlay muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full bg-slate-700 text-slate-400">
                  <VideoOff className="w-8 h-8 mr-2" />
                  Waiting for FOR debater...
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{forUser?.name || "FOR"}</span>
                </div>
              </div>
            </div>

            {/* AGAINST */}
            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
              {againstUser ? (
                <video autoPlay muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full bg-slate-700 text-slate-400">
                  <VideoOff className="w-8 h-8 mr-2" />
                  Waiting for AGAINST debater...
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4" />
                  <span className="font-medium">
                    {againstUser?.name || "AGAINST"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm">
          This is a live spectator view. You cannot interact or join.
        </p>
      </div>
    </div>
  );
}
