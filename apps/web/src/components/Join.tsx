import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebateWithFallback } from "@/lib/useDebateWithFallback";
import { useState } from "react";

export default function JoinPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");

  const { debate, loading, error } = useDebateWithFallback();

  const isFormValid = name.trim();

  function handleJoin() {
    if (!roomId || !debate) return;

    sessionStorage.setItem(
      "debateData",
      JSON.stringify({
        name,
        position,
        roomId,
      })
    );

    navigate(`/lobby/${roomId}`, {
      state: {
        name,
        position,
        roomId,
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Conditional states */}
        {loading && (
          <p className="text-center text-slate-600">Loading debate info...</p>
        )}

        {error && (
          <Card className="bg-red-50 border border-red-200 text-red-700 p-4">
            <p>Error loading debate. Please check your link or try again.</p>
          </Card>
        )}

        {!loading && !error && debate && (
          <>
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Join Debate
                </CardTitle>
                <CardDescription>
                  Topic:{" "}
                  <span className="text-slate-900 font-semibold">
                    {debate.topic}
                  </span>
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
                    placeholder="Enter your name"
                    className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Position Select */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Your Position
                  </Label>
                  <Select
                    value={position}
                    onValueChange={(value) =>
                      value === "for" || value === "against"
                        ? setPosition(value)
                        : null
                    }
                  >
                    <SelectTrigger className="h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="for">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          For
                        </div>
                      </SelectItem>
                      <SelectItem value="against">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Against
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Join Button */}
                <Button
                  onClick={handleJoin}
                  disabled={!isFormValid}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Join Debate
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
