import { LoginForm } from "@/components/admin/LoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.logo}>ESQUE</p>
        <p className={styles.tag}>Вход в редакцию</p>
        <LoginForm />
        <p className={styles.hint}>
          Демо-доступ: editor@esque.su / esque-dev
        </p>
      </div>
    </div>
  );
}
