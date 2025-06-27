import "./App.css"; // reuse styles
import "./WaitingRoom.css"; // create this next

function WaitingRoom() {
  return (
    <div className="waiting-room">
      <div className="hourglass">
        <div className="top"></div>
        <div className="middle"></div>
        <div className="bottom"></div>
      </div>
      <p>Waiting for other participant...</p>
    </div>
  );
}

export default WaitingRoom;
