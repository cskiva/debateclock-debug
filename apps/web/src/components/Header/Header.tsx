import React from "react";
import { Sparkles } from "lucide-react";

export default function Header() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-4 shadow-sm border">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-slate-700">
          Debate Platform
        </span>
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Host a Debate
      </h1>
      <p className="text-slate-600 text-lg">
        Create engaging debates and invite participants to join the discussion
      </p>
    </div>
  );
}
