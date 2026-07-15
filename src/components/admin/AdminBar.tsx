import Link from "next/link";
import { getSession } from "@/lib/dal";
import { logout } from "@/app/admin/auth-actions";
import styles from "@/app/admin/admin.module.css";

export async function AdminBar() {
  const session = await getSession();
  return (
    <div className={styles.bar}>
      <Link href="/admin" className={styles.barLogo}>
        ESQUE
      </Link>
      <span className={styles.barTag}>Редакция</span>
      <span className={styles.barSpacer} />
      {session && <span className={styles.barUser}>{session.name}</span>}
      <Link href="/" className={styles.barBtn} target="_blank">
        Сайт ↗
      </Link>
      <form action={logout}>
        <button type="submit" className={styles.barBtn}>
          Выйти
        </button>
      </form>
    </div>
  );
}
