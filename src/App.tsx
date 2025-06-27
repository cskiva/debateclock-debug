import "./App.css";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50);
}

function App() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState("for");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<{
    invite: string;
    delivery: string;
  } | null>(null);
  const navigate = useNavigate();

  function handleStart() {
    const baseSlug = slugify(topic);
    const roomId = baseSlug || Math.random().toString(36).substring(2, 8);

    setLinks({
      invite: `/join/${roomId}`,
      delivery: `/watch/${roomId}`,
    });

    sessionStorage.setItem("debate-topic", topic);
    sessionStorage.setItem("debate-position", position);
    sessionStorage.setItem("debate-name", name);
  }

  function handleNext() {
    if (!links) return;

    const roomId = links.invite.split("/").pop();
    navigate(`/get-ready/${roomId}`, {
      state: {
        topic: sessionStorage.getItem("debate-topic") || "",
        position: sessionStorage.getItem("debate-position") || "",
        name: sessionStorage.getItem("debate-name") || "",
      },
    });
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Host a Debate</h1>

      <label>
        Your Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", margin: "0.5rem 0", width: "100%" }}
          placeholder="Enter your name"
        />
      </label>

      <label>
        Debate Topic:
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ display: "block", margin: "0.5rem 0", width: "100%" }}
          placeholder="Enter debate topic"
        />
      </label>

      <label>
        Your Position:
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          style={{ display: "block", margin: "0.5rem 0" }}
        >
          <option value="for">For</option>
          <option value="against">Against</option>
        </select>
      </label>

      <div className="bg-blue-500 p-8">hello world</div>

      <button onClick={handleStart}>Host Debate</button>

      {links && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <strong>Invite Link:</strong> {links.invite}
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  window.location.origin + links.invite
                )
              }
            >
              Copy
            </button>
          </div>
          <div>
            <strong>Delivery Link:</strong> {links.delivery}
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  window.location.origin + links.delivery
                )
              }
            >
              Copy
            </button>
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <button onClick={handleNext}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
