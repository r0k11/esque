import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container rise" style={{ paddingBlock: "var(--sp-24)", textAlign: "center" }}>
      <p className="label label--accent">Ошибка 404</p>
      <h1 style={{ fontSize: "var(--text-hero)", marginTop: "var(--sp-4)" }}>
        Такой страницы нет
      </h1>
      <p style={{ color: "var(--grey)", marginTop: "var(--sp-6)" }}>
        Возможно, материал переехал или адрес набран с опечаткой.
      </p>
      <p style={{ marginTop: "var(--sp-8)" }}>
        <Link href="/" className="label" style={{ borderBottom: "1px solid currentColor" }}>
          На главную
        </Link>
      </p>
    </main>
  );
}
