import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import GetReady from "./GetReady";
import WaitingRoom from "./WaitingRoom"; // ✅ import the real one
import Lobby from "./Lobby";



ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/get-ready/:roomId" element={<GetReady />} />
        <Route path="/waiting-room/:roomId" element={<WaitingRoom />} /> {/* ✅ dynamic path */}
        <Route path="/lobby/:roomId" element={<Lobby />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
  
