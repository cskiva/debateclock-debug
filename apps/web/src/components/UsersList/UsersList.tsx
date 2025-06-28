import { CheckCircle2, Clock, UserCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

import { useSocket } from "@/_context/SocketContext";

export default function UsersList() {
  const { users } = useSocket();

  return (
    <>
      {users.length}
      {users.map((user) => (
        <TooltipProvider key={user.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-default">
                <UserCircle2 className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <span
                    className={`text-xs font-mono ${
                      user.position === "for" ? "text-blue-500" : "text-red-500"
                    }`}
                  >
                    {user.position}
                  </span>
                </div>
                {user.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </>
  );
}
