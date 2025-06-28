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
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // Adjust import path as needed
import { useDebateState } from "@/hooks/useDebateState";

// Navigation configuration
const navConfig = {
  main: [
    { label: "Debates", href: "/debates", icon: MessageSquare },
    { label: "Tournaments", href: "/tournaments", icon: Trophy },
    { label: "Learn", href: "/learn", icon: BookOpen },
    { label: "Community", href: "/community", icon: Users },
  ],
};

export default function Navbar() {
  const [latestRoomId, setLatestRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch latest debate from Supabase
  useEffect(() => {
    const fetchLatestDebate = async () => {
      try {
        console.log("🔍 Fetching latest debate from Supabase");
        const { data, error } = await supabase
          .from("debates")
          .select("room_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching latest debate:", error);
          return;
        }

        if (data) {
          console.log("✅ Latest debate room ID:", data.room_id);
          setLatestRoomId(data.room_id);
        }
      } catch (error) {
        console.error("Error in fetchLatestDebate:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestDebate();

    // Optional: Set up real-time subscription to get updates when new debates are created
    const channel = supabase
      .channel("debates-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "debates" },
        (payload) => {
          console.log("🆕 New debate created:", payload.new.room_id);
          setLatestRoomId(payload.new.room_id);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Generate join and watch URLs
  const joinUrl = latestRoomId ? `/join/${latestRoomId}` : "/join";
  const watchUrl = latestRoomId ? `/watch/${latestRoomId}` : "/watch";

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
                <Button
                  variant="ghost"
                  className="flex items-center space-x-1"
                  disabled={loading}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {loading ? "Loading..." : "Participate"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white">
                <DropdownMenuLabel>
                  {latestRoomId ? "Latest Debate" : "No Active Debates"}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  disabled={!latestRoomId}
                  asChild
                >
                  <Link to={joinUrl}>
                    <Users className="w-4 h-4" />
                    <span>
                      {latestRoomId
                        ? "Join Latest Debate"
                        : "No Debate Available"}
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  asChild
                >
                  <Link to="/host">
                    <Settings className="w-4 h-4" />
                    <span>Host New Debate</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Viewer Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-1"
                  disabled={loading}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {loading ? "Loading..." : "Watch"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white">
                <DropdownMenuLabel>
                  {latestRoomId ? "Live Debates" : "No Active Debates"}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  disabled={!latestRoomId}
                  asChild
                >
                  <Link to={watchUrl}>
                    <Eye className="w-4 h-4" />
                    <span>
                      {latestRoomId
                        ? "Watch Latest Debate"
                        : "No Debate Available"}
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  asChild
                >
                  <Link to="/debates">
                    <MessageSquare className="w-4 h-4" />
                    <span>Browse All Debates</span>
                  </Link>
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
                className="bg-gradient-to-r text-white from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
                      {latestRoomId ? "Latest Debate" : "No Active Debates"}
                    </h3>
                    {latestRoomId ? (
                      <>
                        <Link
                          to={joinUrl}
                          className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                        >
                          <Users className="w-4 h-4" />
                          <span>Join Latest Debate</span>
                        </Link>
                        <Link
                          to={watchUrl}
                          className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-purple-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Watch Latest Debate</span>
                        </Link>
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {loading
                          ? "Loading debates..."
                          : "No debates available"}
                      </div>
                    )}
                    <Link
                      to="/host"
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Host New Debate</span>
                    </Link>
                  </div>

                  {/* Mobile Auth */}
                  <div className="border-t pt-4 space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                    <Button className="w-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
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
