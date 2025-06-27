import { Copy, Eye, Loader2, Users, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Slugify util
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

interface DebateLinksCardProps {
  topic: string;
  showViewerLink?: boolean;
  className?: string;
  handleNext: () => void;
}

export default function DebateLinksCard({
  topic,
  showViewerLink = true,
  className = "",
  handleNext,
}: DebateLinksCardProps) {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Auto-generate slug with debounce
  useEffect(() => {
    if (!topic.trim()) {
      setSlug("");
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      setSlug(slugify(topic));
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [topic]);

  const invite = slug ? `/join/${slug}` : "";
  const delivery = slug ? `/watch/${slug}` : "";

  async function copyToClipboard(text: string, type: string) {
    try {
      await navigator.clipboard.writeText(window.location.origin + text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }

  return (
    <div className={`space-y-4 py-6 ${className}`}>
      {/* Participant Invite */}
      <div className="space-y-2 p-3 rounded-md">
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
            value={slug ? window.location.origin + invite : ""}
            readOnly
            placeholder={loading ? "Generating..." : "Link will appear here"}
            className="font-mono text-sm bg-slate-50 border-slate-200"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!slug || loading}
            onClick={() => copyToClipboard(invite, "invite")}
            className="px-3 min-w-[80px] text-green-600 border-green-400 hover:bg-green-400/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied === "invite" ? (
              <span className="text-green-600 text-xs font-medium">
                Copied!
              </span>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {showViewerLink && (
        <>
          <Separator className="bg-slate-200" />

          {/* Viewer Link */}
          <div className="space-y-2 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <Label className="font-medium text-slate-700">Viewer Link</Label>
              <Badge variant="secondary" className="text-xs">
                For audience
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                value={slug ? window.location.origin + delivery : ""}
                readOnly
                placeholder={
                  loading ? "Generating..." : "Link will appear here"
                }
                className="font-mono text-sm bg-slate-50 border-slate-200"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!slug || loading}
                onClick={() => copyToClipboard(delivery, "delivery")}
                className="px-3 min-w-[80px] text-amber-600 border-amber-400 hover:bg-amber-400/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : copied === "delivery" ? (
                  <span className="text-amber-600 text-xs font-medium">
                    Copied!
                  </span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
      <div>
        <Button
          onClick={handleNext}
          className="w-full h-12 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <VideoIcon />
          Go to Room
        </Button>
      </div>
    </div>
  );
}
