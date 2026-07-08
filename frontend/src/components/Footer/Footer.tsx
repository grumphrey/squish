import { IconAlertCircle, IconBrandGithub } from "@tabler/icons-react";
import styles from "./Footer.module.css";
import { Link } from "@tanstack/react-router";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Link to="/" className={styles.logo}>
        squi<span>.</span>sh
      </Link>
      <div className={styles.middle}>
        <IconAlertCircle />
        <span>
          this side project was developed for learning purposes! © 2026
        </span>
      </div>
      <div className={styles.right}>
        <span>built by </span>
        <a
          href="https://www.github.com/grumphrey"
          target="_blank"
          className={styles.link}
        >
          <IconBrandGithub height="20px" />
          <span>humphrey</span>
        </a>
      </div>
    </footer>
  );
}
