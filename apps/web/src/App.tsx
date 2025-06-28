import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { MessageSquare, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { useRef, useState } from "react";

import { Button } from "./components/ui/button";
import DebateLinksCard from "./components/DebateLinksCard";
import Header from "./components/Header";
import { Input } from "./components/ui/input";
import { Label } from "@/components/ui/label";
import { createDebateOnServer } from "./lib/createDebateAndSync";
import { useNavigate } from "react-router-dom";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function App() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<{
    invite: string;
    delivery: string;
  } | null>(null);

  // Generate debate ID once and keep it stable
  const debateIdRef = useRef<string>(generateUUID());

  const navigate = useNavigate();

  function handleStart() {
    const baseSlug = slugify(topic);
    const roomId = baseSlug || Math.random().toString(36).substring(2, 8);

    createDebateOnServer({
      topic,
      position,
      name,
      roomId,
      clientId: debateIdRef.current, // Pass the stable client ID
    });

    setLinks({
      invite: `/join/${roomId}`,
      delivery: `/watch/${roomId}`,
    });

    // Store debate data in sessionStorage for the next route
    sessionStorage.setItem(
      "debateData",
      JSON.stringify({
        topic,
        position,
        name,
        roomId,
        clientId: debateIdRef.current, // Include the stable client ID
      })
    );
  }

  function handleNext() {
    if (!links) return;

    const roomId = links.invite.split("/").pop() ?? "";

    createDebateOnServer({
      topic,
      position,
      name,
      roomId,
      clientId: debateIdRef.current, // Pass the stable client ID
    });

    // Pass the debate data through the route state
    navigate(`/lobby/${roomId}`, {
      state: {
        topic,
        position,
        name,
        roomId,
        clientId: debateIdRef.current,
      },
    });
  }

  const isFormValid = name.trim() && topic.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <Header />

        {/* Main Form Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Debate Setup
            </CardTitle>
            <CardDescription>
              Fill in the details below to create your debate room
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

            {/* Topic Input */}
            <div className="space-y-2">
              <Label
                htmlFor="topic"
                className="text-sm font-medium text-slate-700"
              >
                Debate Topic
              </Label>
              <Input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Should artificial intelligence be regulated?"
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
                  value == "for" || (value == "against" && setPosition(value))
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

            {/* Host Button */}
            <Button
              onClick={handleStart}
              disabled={!isFormValid}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4 mr-2" />
              Host Debate
            </Button>
          </CardContent>
        </Card>

        {/* Links Card */}
        {links && <DebateLinksCard topic={topic} handleNext={handleNext} />}

        {/* Info Card */}
        <Card className="mt-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-slate-900">How it works</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Share the <strong>participant link</strong> with your debate
                  opponent and the <strong>viewer link</strong> with your
                  audience. Once everyone joins, you can start your structured
                  debate with timed rounds and real-time engagement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
