import type { ReactNode } from "react";

export default function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="hero">
      {children}
    </section >
  )
}
