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
      <div className="login-input login-password-input-container">
        <PasswordToggleField.Input
          className="login-password-input"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          minLength={8}
        />
        <PasswordToggleField.Toggle className="login-password-toggle">
          <PasswordToggleField.Icon
            visible={<i className="ti ti-eye" />}
            hidden={<i className="ti ti-eye-closed" />}
          />
        </PasswordToggleField.Toggle>
      </div>
    </PasswordToggleField.Root>
  );
}
