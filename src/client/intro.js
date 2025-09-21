import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

function Intro(props) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Use the actual game URL
        const gameURL = `${window.location.origin}/#${props.gameid}`;
        const dataURL = await QRCode.toDataURL(gameURL, {
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",    // Solid black
            light: "#FFFFFF",   // Solid white
          },
        });
        setQrCodeDataURL(dataURL);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    generateQRCode();
  }, [props.gameid]);

  return (
    <div className="roomCodeInfo">
      <h1 className="title">False Alarm!</h1>
      <h5>
        Game code: <span className="gameid">{props.gameid}</span>
      </h5>

      <h6>
        Invite friends with this link: <br />
        <a href={window.location.href}>{window.location.href}</a>
      </h6>

      {qrCodeDataURL && (
        <div className="qrCodeContainer">
          <img
            src={qrCodeDataURL}
            alt="QR Code for game link"
            className="qrCode"
            style={{
              display: "block",
              margin: "10px auto",
              border: "2px solid #ccc",
              borderRadius: "8px",
              padding: "10px",
              backgroundColor: "white",
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: "#666",
              textAlign: "center",
              margin: "5px 0",
            }}
          >
            Scan to join the game
          </p>
        </div>
      )}

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
