import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // ✅ combined import
import { useLocation } from "react-router-dom";

function GetReady() {
  const [name, setName] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
const { topic, position } = location.state || { topic: "", position: "" };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera/Mic access denied"));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Get Ready</h1>
      <p><strong>Room ID:</strong> {roomId}</p>

      <label>
        Your Name:
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", margin: "0.5rem 0", width: "100%" }}
        />
      </label>

      <video ref={videoRef} autoPlay muted style={{ width: "100%", maxWidth: "400px" }} />

      <p>(Mic meter coming soon)</p>

     <button
  onClick={() =>
    navigate(`/lobby/${roomId}`, {
      state: {
        name,
        topic,
        position,
      },
    })
  }
>
  Continue
</button>

    </div>
  );
}

export default GetReady;
