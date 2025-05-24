import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import stoneAd from "./assets/stonebanner.png";

function Debate() {
  const location = useLocation();
  const { topic, position, name, duration } = location.state || {};

  const [elapsed, setElapsed] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState<"for" | "against">("for");

  const videoRefFor = useRef<HTMLVideoElement>(null);
  const videoRefAgainst = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (position === "for" && videoRefFor.current) {
          videoRefFor.current.srcObject = stream;
        } else if (position === "against" && videoRefAgainst.current) {
          videoRefAgainst.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera/Mic access denied"));
  }, [position]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  function getLowerThirdColor(role: "for" | "against") {
    if (activeSpeaker === role) {
      return role === "for" ? "#2a5df2cc" : "#e54d4dcc"; // Blue or Red with opacity
    }
    return role === "for" ? "#2a5df233" : "#e54d4d33"; // Lighter if inactive
  }

  function renderVideoBlock(role: "for" | "against", ref: React.RefObject<HTMLVideoElement>) {
    const isActive = activeSpeaker === role;
    const isSelf = position === role;
    const label = role.toUpperCase();
    const labelName = isSelf ? name : "Waiting...";

    return (
      <div
        style={{
          width: isActive ? "80%" : "20%",
          height: "100%",
          position: isActive ? "relative" : "absolute",
          bottom: isActive ? undefined : 20,
          right: isActive ? undefined : 20,
          border: isActive ? "none" : "2px solid white",
          borderRadius: 8,
          transition: "all 0.3s ease",
          boxShadow: isActive ? "none" : "0 0 10px rgba(0,0,0,0.7)",
          backgroundColor: "#000",
          overflow: "hidden",
          zIndex: isActive ? 1 : 10,
        }}
      >
        <video
          ref={ref}
          autoPlay
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
        />
        {!isActive && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              height: "50%",
              backgroundColor: "lime",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
            }}
          >
            <img
              src={stoneAd}
              alt="Stone Ad"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                border: "2px solid white",
              }}
            />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            backgroundColor: getLowerThirdColor(role),
            color: "white",
            padding: "0.3rem 0.6rem",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {label}: {labelName}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>Debate in Progress</h2>
      <p style={{ textAlign: "center" }}><strong>Topic:</strong> {topic}</p>

      <div style={{ position: "relative", height: 360, display: "flex", alignItems: "stretch", backgroundColor: "#222" }}>
        {renderVideoBlock("for", videoRefFor)}
        {renderVideoBlock("against", videoRefAgainst)}
      </div>

      <button
        style={{ marginTop: 20, padding: "0.5rem 1rem" }}
        onClick={() => setActiveSpeaker(activeSpeaker === "for" ? "against" : "for")}
      >
        Pass Turn
      </button>
    </div>
  );
}

export default Debate;
