import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Lobby from "./Lobby";
import Debate from "./Debate"; // 🆕 Import the new component
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/get-ready/:roomId" element={<Lobby />} />
        <Route path="/debate/:roomId" element={<Debate />} /> {/* 🆕 Add this line */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
