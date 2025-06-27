import "./index.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import Debate from "./Debate"; // 🆕 Import the new component
import Layout from "./components/Layout";
import Lobby from "./Lobby";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <App />
            </Layout>
          }
        />
        <Route path="/get-ready/:roomId" element={<Lobby />} />
        <Route path="/debate/:roomId" element={<Debate />} />{" "}
        {/* 🆕 Add this line */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
