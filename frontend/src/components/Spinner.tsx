interface SpinnerProps {
  size?: number;
  thickness?: number;
}

export default function Spinner({ size = 16, thickness = 2 }: SpinnerProps) {
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `${thickness}px solid rgba(255, 255, 255, 0.35)`,
      }}
      id="spinner"
    />
  );
}
