import "./ShareOptions.css";

function ShareOptions({ onShareWhatsApp, onSharePDF, onShareSMS, onCallAgrovet }) {
  return (
    <div className="share-options">
      <button className="share-btn" onClick={onShareWhatsApp}>
        WhatsApp
      </button>
      <button className="share-btn" onClick={onSharePDF}>
        Save as PDF
      </button>
      <button className="share-btn" onClick={onShareSMS}>
        Send via SMS
      </button>
      <button className="share-btn" onClick={onCallAgrovet}>
        Call Agrovet
      </button>
    </div>
  );
}

export default ShareOptions;