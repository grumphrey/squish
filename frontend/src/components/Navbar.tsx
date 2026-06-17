import logo from "../assets/longdog.png"
import { useTheme } from "../context/ThemeContext"

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-left">
        <img height="30px" src={logo} />
        <a href="/" className="nav-logo">squi<span>.</span>sh</a>
      </div>
      <ThemeButton />
    </nav >
  )
}

function ThemeButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme == "dark"

  return (
    <div
      id="toggle"
      className={`toggle-track ${isDark ? "dark" : ""}`}
      role="switch"
      onClick={toggleTheme}
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      tabIndex={0}>
      <div className="toggle-thumb">
        <i className={`ti ${isDark ? "ti-moon" : "ti-sun"}`} aria-hidden="true"></i>
      </div>
    </div >
  )
}
