export const metadata = {
  title: "生活誌",
  description: "個人生活資訊 dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          fontFamily: "'Noto Sans TC', sans-serif",
          background: "#eee7d8",
          color: "#1c2b2a",
          minHeight: "100vh",
        }}
      >
        <nav
          style={{
            display: "flex",
            gap: 20,
            padding: "16px 20px",
            borderBottom: "2px solid #1c2b2a",
            fontFamily: "monospace",
          }}
        >
          <a href="/" style={{ color: "#1c2b2a", fontWeight: "bold" }}>生活誌</a>
          <a href="/nagoya" style={{ color: "#1c2b2a" }}>名古屋</a>
          <a href="/uk" style={{ color: "#1c2b2a" }}>英國</a>
        </nav>
        <main style={{ padding: "20px", maxWidth: 720, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
