import {
  BookOpen,
  Clock,
  Eye,
  Menu,
  MessageSquare,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import React from "react";

// Navigation configuration
const navConfig = {
  main: [
    { label: "Debates", href: "/debates", icon: MessageSquare },
    { label: "Tournaments", href: "/tournaments", icon: Trophy },
    { label: "Learn", href: "/learn", icon: BookOpen },
    { label: "Community", href: "/community", icon: Users },
  ],
  currentDebate: {
    participant: {
      label: "Join Debate",
      href: "/join/example-debate",
      icon: Users,
    },
    viewer: { label: "Watch Live", href: "/watch/example-debate", icon: Eye },
  },
};

export default function Navbar() {
  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={"/"}>
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tighter">
                  DebateClock
                </span>
              </div>
            </div>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navConfig.main.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center space-x-1 text-slate-700 hover:text-indigo-600 transition-colors duration-200 font-medium"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          {/* Current Debate Dropdowns & Auth */}
          <div className="flex items-center space-x-4">
            {/* Participant Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Participate</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Current Debate</DropdownMenuLabel>
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Join Debate</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Host New Debate</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Viewer Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Watch</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Live Debates</DropdownMenuLabel>
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Watch Live</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Browse All Debates</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-slate-200">
              <Button variant="ghost" size="sm">
                Login
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Sign Up
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Mobile Main Nav */}
                  <div className="space-y-2">
                    {navConfig.main.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.href}
                          className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>

                  {/* Mobile Debate Actions */}
                  <div className="border-t pt-4 space-y-2">
                    <h3 className="text-sm font-medium text-slate-900 px-3">
                      Current Debate
                    </h3>
                    <a
                      href={navConfig.currentDebate.participant.href}
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                    >
                      <Users className="w-4 h-4" />
                      <span>Join Debate</span>
                    </a>
                    <a
                      href={navConfig.currentDebate.viewer.href}
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Watch Live</span>
                    </a>
                    <a
                      href="/host"
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Host New Debate</span>
                    </a>
                  </div>

                  {/* Mobile Auth */}
                  <div className="border-t pt-4 space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                      Sign Up
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
