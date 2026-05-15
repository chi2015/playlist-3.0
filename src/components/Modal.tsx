import { useEffect, useState } from 'react';

type ModalProps = {
  show: boolean;
  confirmDelete: boolean;
  errorTxt: string | false;
  actualDate: string;
  onClose: () => void;
  onDelete: (date: string, password: string) => void;
};

export function Modal({
  show,
  confirmDelete,
  errorTxt,
  actualDate,
  onClose,
  onDelete,
}: ModalProps) {
  const [password, setPassword] = useState('');

  // Reset the password each time the modal closes so the next open starts clean.
  useEffect(() => {
    if (!show) setPassword('');
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {confirmDelete && <h3>Delete playlist</h3>}
          {errorTxt && <h3>Error</h3>}
        </div>
        <div className="modal-body">
          {errorTxt && <span>{errorTxt}</span>}
          {confirmDelete && (
            <span>Are you sure you want to delete playlist dated {actualDate}?</span>
          )}
          {confirmDelete && (
            <label className="form-label">
              Enter password to delete:
              <input
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="modal-footer text-right">
          {errorTxt && (
            <button className="modal-default-button" onClick={onClose}>
              OK
            </button>
          )}
          {confirmDelete && (
            <button
              className="modal-default-button"
              onClick={() => {
                onDelete(actualDate, password);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          {confirmDelete && (
            <button className="modal-default-button" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
