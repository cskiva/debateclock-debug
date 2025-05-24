import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "./Lobby.css";

function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, position, name, duration } = location.state || {
    topic: "",
    position: "",
    name: "",
    duration: 10,
  };

  const [secondsLeft, setSecondsLeft] = useState(20);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera/Mic access denied"));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Navigate to debate page when countdown ends
          navigate(`/debate/${topic}`, {
            state: { topic, position, name, duration },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, topic, position, name, duration]);

  return (
    <div className="lobby-screen">
      <h1>Debate Lobby</h1>
      <p className="topic"><strong>Topic:</strong> {topic}</p>
      <p className="countdown"><strong>Starting in:</strong> {secondsLeft}s</p>

      <div className="video-row">
        {position === "for" ? (
          <>
            <div className="video-box blue">
              <video ref={videoRef} autoPlay muted />
              <div className="lower-third">
                <div className="role">FOR:</div>
                <div className="name">{name}</div>
              </div>
            </div>
            <div className="video-box red placeholder">
              <div className="greyed-out"></div>
              <div className="lower-third">
                <div className="role">AGAINST:</div>
                <div className="name">Waiting...</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="video-box blue placeholder">
              <div className="greyed-out"></div>
              <div className="lower-third">
                <div className="role">FOR:</div>
                <div className="name">Waiting...</div>
              </div>
            </div>
            <div className="video-box red">
              <video ref={videoRef} autoPlay muted />
              <div className="lower-third">
                <div className="role">AGAINST:</div>
                <div className="name">{name}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Lobby;

