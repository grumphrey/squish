export default function Footer() {
  return (
    <footer>
      <a href="/" className="footer-logo">
        squi<span>.</span>sh
      </a>
      <div className="footer-middle">
        <i className="ti ti-alert-circle" /> this project was developed for
        learning purposes! use at your own risk. © 2026
      </div>
      <div className="footer-right">
        built by{" "}
        <a
          href="https://www.github.com/grumphrey"
          target="_blank"
          className="footer-link"
        >
          <i className="ti ti-brand-github" />
          humphrey
        </a>
      </div>
    </footer>
  );
}
