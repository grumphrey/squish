import { IconAlertCircle, IconBrandGithub } from "@tabler/icons-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <a href="/" className={styles.logo}>
        squi<span>.</span>sh
      </a>
      <div className={styles.middle}>
        <IconAlertCircle />
        <span>
          this project was developed for learning purposes! use at your own
          risk. © 2026
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
