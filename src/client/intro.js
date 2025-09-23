import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

function Intro(props) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const url = window.location.href;
        
        // Only generate QR code if we have a valid URL string
        if (url && typeof url === 'string' && url.length > 0) {
          const dataURL = await QRCode.toDataURL(url, {
            width: 200,
            margin: 0,
            color: {
              dark: "#000000FF", // Solid black
              light: "#FFFFFFFF", // Solid white
            },
          });
          setQrCodeDataURL(dataURL);
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
        throw error;
      }
    };

    generateQRCode();
  }, [window.location.href]);

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
            }}
          />
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
