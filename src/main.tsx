import "./index.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import Debate from "./Debate"; // 🆕 Import the new component
import GetReady from "./GetReady";
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
        <Route
          path="/get-ready/:roomId"
          element={
            <Layout>
              <GetReady />
            </Layout>
          }
        />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route
          path="/debate/:roomId"
          element={
            <Layout>
              <Debate />
            </Layout>
          }
        />
        {/* 🆕 Add this line */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
