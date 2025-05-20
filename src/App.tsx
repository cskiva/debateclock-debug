import { useState } from "react";
import { useNavigate } from "react-router-dom";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 50); // limit length
}


function App() {
  const [topic, setTopic] = useState("");
  const [position, setPosition] = useState("for");
  const [links, setLinks] = useState<{ invite: string; delivery: string } | null>(null);

  const navigate = useNavigate();

  function handleStart() {
  const baseSlug = slugify(topic);
  const roomId = baseSlug || Math.random().toString(36).substring(2, 8);

  setLinks({
    invite: `/join/${roomId}`,
    delivery: `/watch/${roomId}`,
  });
}


  return (
    <div style={{ padding: "2rem" }}>
      <h1>Start a Debate</h1>

      <label>
        Debate Topic:
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ display: "block", margin: "0.5rem 0", width: "100%" }}
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

     <button onClick={handleStart}>Host Debate</button>
{links && (
  <div style={{ marginTop: "1rem" }}>
    <div style={{ marginBottom: "1rem" }}>
      <strong>Invite Link:</strong> {links.invite}
      <button onClick={() => navigator.clipboard.writeText(window.location.origin + links.invite)}>
        Copy
      </button>
    </div>
    <div>
      <strong>Delivery Link:</strong> {links.delivery}
      <button onClick={() => navigator.clipboard.writeText(window.location.origin + links.delivery)}>
        Copy
      </button>
    </div>
<div style={{ marginTop: "1.5rem" }}>
  <button onClick={() => navigate(`/get-ready/${links.invite.split("/").pop()}`)}>
    Next
  </button>
</div>
</div>
)}

</div>
);
}

export default App;
