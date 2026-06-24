import styles from "./DialogError.module.css";
import { IconExclamationCircle } from "@tabler/icons-react";

interface DialogErrorProps {
  message?: string;
}
export default function DialogError({ message }: DialogErrorProps) {
  return (
    <div className={styles.dialogErrorContainer}>
      <IconExclamationCircle stroke={2} height="30px" />
      <div className={styles.dialogErrorText}>
        <h5 className={styles.dialogErrorTitle}>Error</h5>
        <p className={styles.dialogErrorDesc}>{message}</p>
      </div>
    </div>
  );
}
