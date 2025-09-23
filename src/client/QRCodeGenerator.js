import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

function QRCodeGenerator({ url }) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const dataURL = await QRCode.toDataURL(url, {
          width: 200,
          margin: 0,
          color: {
            dark: "#000000FF", // Solid black
            light: "#FFFFFFFF", // Solid white
          },
        });
        setQrCodeDataURL(dataURL);
      } catch (error) {
        console.error("Error generating QR code:", error);
        // Set error state to trigger render-time error
        setError(error);
      }
    };

    generateQRCode();
  }, [url]);

  // Throw error during render so Error Boundary can catch it
  if (error) {
    throw error;
  }

  if (!qrCodeDataURL) {
    return null;
  }

  return (
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
  );
}

export default QRCodeGenerator;