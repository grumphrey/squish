import styles from "./PasswordField.module.css";
import { type Dispatch, type SetStateAction } from "react";

import { unstable_PasswordToggleField as PasswordToggleField } from "radix-ui";

export default function PasswordField({
  password,
  setPassword,
}: {
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
}) {
  return (
    <PasswordToggleField.Root>
      <div className={`${styles.loginInput} ${styles.passwordInputContainer}`}>
        <PasswordToggleField.Input
          className={styles.passwordInput}
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          minLength={8}
        />
        <PasswordToggleField.Toggle className={styles.passwordToggle}>
          <PasswordToggleField.Icon
            visible={<i className="ti ti-eye" />}
            hidden={<i className="ti ti-eye-closed" />}
          />
        </PasswordToggleField.Toggle>
      </div>
    </PasswordToggleField.Root>
  );
}
