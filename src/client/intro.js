import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import QRCodeGenerator from "./QRCodeGenerator";

// Fallback component for QR code errors
function QRFallback() {
  return (
    <div className="qrCodeContainer">
      <p style={{ 
        textAlign: "center", 
        margin: "10px auto",
        fontSize: "0.9em",
        color: "#666"
      }}>
        QR code unavailable
      </p>
    </div>
  );
}

// The link other players open: this page and the game code, without any query.
function joinUrl() {
  const { origin, pathname, hash } = window.location;
  return origin + pathname + hash;
}

function Intro(props) {
  const url = joinUrl();

  return (
    <div className="roomCodeInfo">
      <h1 className="title">False Alarm!</h1>
      <h5>
        Game code: <span className="gameid">{props.gameid}</span>
      </h5>

      <h6>
        Invite friends with this link: <br />
        <a href={url}>{url}</a>
      </h6>

      <ErrorBoundary FallbackComponent={QRFallback}>
        <QRCodeGenerator url={url} />
      </ErrorBoundary>

      <h6>
        Or join another game: <br />
        <form onSubmit={props.handleJoin}>
          <input
            type="text"
            placeholder="abcd"
            size="6"
            className="joinGameCodeInput"
            value={props.joinCode}
            onChange={props.handleJoinCodeChange}
          />
          <button
            type="button"
            className="joinButton"
            onClick={props.handleJoin}
          >
            Join
          </button>
        </form>
      </h6>
    </div>
  );
}

export default Intro;
