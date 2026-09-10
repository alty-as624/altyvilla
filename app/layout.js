export const metadata = {
  title: "蘇宅",
  description: "個人生活資訊 dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const navLinkStyle = {
  color: "#1c2b2a",
  textDecoration: "none",
  fontFamily: "'Noto Sans TC', sans-serif",
  fontSize: 15,
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
          }}
        >
          <a href="/" style={{ ...navLinkStyle, fontWeight: "bold" }}>蘇宅</a>
          <a href="/nagoya" style={navLinkStyle}>名古屋</a>
          <a href="/uk" style={navLinkStyle}>英國</a>
        </nav>
        <main style={{ padding: "20px", maxWidth: 480, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
