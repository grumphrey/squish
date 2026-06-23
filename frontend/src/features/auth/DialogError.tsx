import { IconExclamationCircle } from "@tabler/icons-react";

interface DialogErrorProps {
  message?: string;
}
export default function DialogError({ message }: DialogErrorProps) {
  return (
    <div className="login-dialog-error">
      <IconExclamationCircle stroke={2} height="30px" />
      <div className="login-dialog-error-text">
        <h5 className="login-dialog-error-title">Error</h5>
        <p className="login-dialog-error-desc">{message}</p>
      </div>
    </div>
  );
}
