import type { Metadata } from "next";
import "../globals.css";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Редакция ESQUE",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.workspace}>{children}</div>;
}
