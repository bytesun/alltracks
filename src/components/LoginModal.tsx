import '../styles/LoginModal.css';
export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (method: string) => void }> = ({ 
  isOpen, 
  onClose, 
  onLogin 
}) => {
  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-content">
        <button className="close-button" onClick={onClose} aria-label="Close">
          <span className="material-icons">close</span>
        </button>

        <h2>Sign In to AllTracks</h2>

        <p className="login-modal-description">
          AllTracks uses <strong>Internet Identity</strong> — a secure, password-free
          authentication system. Sign in with your device's built-in biometrics (Face ID,
          fingerprint, Windows Hello) or a hardware security key.
        </p>

        <div className="login-options">
          <button className="login-button ii" onClick={() => onLogin('iiv2')}>
            <img src="/dfinity.ico" alt="Internet Identity" />
            Sign in with Internet Identity
          </button>
        </div>

        <div className="login-modal-info">
          <span className="material-icons login-modal-info-icon">info</span>
          <span>
            First time?{' '}
            <a
              href="https://id.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="login-modal-link"
            >
              Create a free Internet Identity
            </a>{' '}
            — takes about 30 seconds. No password needed.
          </span>
        </div>

        <div className="login-modal-benefits">
          <div className="login-modal-benefit">
            <span className="material-icons">lock</span>
            <span>No passwords to remember or leak</span>
          </div>
          <div className="login-modal-benefit">
            <span className="material-icons">visibility_off</span>
            <span>Privacy-preserving — no cross-site tracking</span>
          </div>
          <div className="login-modal-benefit">
            <span className="material-icons">verified_user</span>
            <span>Sessions last up to 7 days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
