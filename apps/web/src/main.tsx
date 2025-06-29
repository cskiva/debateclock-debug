import "./index.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import Debate from "./Debate"; // 🆕 Import the new component
import JoinRoom from "./components/JoinRoom";
import Layout from "./components/Layout";
import Lobby from "./Lobby";
import React from "react";
import ReactDOM from "react-dom/client";
import { SocketProvider } from "./_context/SocketContext";
import WatchPage from "./components/Watch";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SocketProvider>
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
            path="/lobby/:roomId"
            element={
              <Layout>
                <Lobby />
              </Layout>
            }
          />
          <Route
            path="/debate/:roomId"
            element={
              <Layout>
                <Debate />
              </Layout>
            }
          />
          <Route
            path="/join/:roomId"
            element={
              <Layout>
                <JoinRoom />
              </Layout>
            }
          />
          <Route
            path="/watch/:roomId"
            element={
              <Layout>
                <WatchPage />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </React.StrictMode>
);
