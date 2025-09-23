import React from "react";

class QRErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error("QR Code Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show fallback UI when QR generation fails
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

    return this.props.children;
  }
}

export default QRErrorBoundary;