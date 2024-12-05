import '../styles/LoginModal.css';
export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (method: string) => void }> = ({ 
  isOpen, 
  onClose, 
  onLogin 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="login-modal-content">
        <h2>Sign In with </h2>
        <div className="login-options">
          <button className="login-button ii" onClick={() => onLogin('ii')}>
            <img src="/dfinity.ico" alt="Internet Identity" />
            Internet Identity
          </button>
          <button className="login-button google" onClick={() => onLogin('google')}>
          <img src="/google.png" alt="Google" />
           Google
          </button>
        </div>
        <button className="close-button" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
};
