import { ArrowRight, Copy, Eye, MessageSquare, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import Header from "./components/Header";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { useState } from "react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function App() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState("for");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<{
    invite: string;
    delivery: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  // Navigation would be handled by your router in the actual app

  function handleStart() {
    const baseSlug = slugify(topic);
    const roomId = baseSlug || Math.random().toString(36).substring(2, 8);

    setLinks({
      invite: `/join/${roomId}`,
      delivery: `/watch/${roomId}`,
    });

    // Note: Using in-memory storage instead of sessionStorage for Claude.ai compatibility
    // In a real app, you'd use sessionStorage here
  }

  function handleNext() {
    if (!links) return;

    const roomId = links.invite.split("/").pop();
    // In your actual app, you'd navigate here:
    // navigate(`/get-ready/${roomId}`, { state: { topic, position, name } });
    alert(
      `Would navigate to: /get-ready/${roomId} with data: ${JSON.stringify({
        topic,
        position,
        name,
      })}`
    );
  }

  async function copyToClipboard(text: string, linkType: string) {
    try {
      await navigator.clipboard.writeText(window.location.origin + text);
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
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
              <Select value={position} onValueChange={setPosition}>
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
        {links && (
          <Card className="mt-6 shadow-xl border-0 bg-white/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Debate Room Created!
              </CardTitle>
              <CardDescription>
                Share these links with participants and viewers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invite Link */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <Label className="font-medium text-slate-700">
                    Participant Invite
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    For debaters
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={window.location.origin + links.invite}
                    readOnly
                    className="font-mono text-sm bg-slate-50 border-slate-200"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(links.invite, "invite")}
                    className="px-3 min-w-[80px] border-slate-200 hover:bg-slate-50"
                  >
                    {copiedLink === "invite" ? (
                      <span className="text-green-600 text-xs font-medium">
                        Copied!
                      </span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              {/* Delivery Link */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <Label className="font-medium text-slate-700">
                    Viewer Link
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    For audience
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={window.location.origin + links.delivery}
                    readOnly
                    className="font-mono text-sm bg-slate-50 border-slate-200"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(links.delivery, "delivery")}
                    className="px-3 min-w-[80px] border-slate-200 hover:bg-slate-50"
                  >
                    {copiedLink === "delivery" ? (
                      <span className="text-green-600 text-xs font-medium">
                        Copied!
                      </span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Next Button */}
              <div className="pt-4">
                <Button
                  onClick={handleNext}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Continue to Prep Room
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
