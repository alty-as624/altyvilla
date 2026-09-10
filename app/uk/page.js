"use client";
import { useEffect, useState } from "react";

export default function UK() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: "serif" }}>英國</h1>
      <div
        style={{
          background: "#1c2b2a",
          color: "#eee7d8",
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontFamily: "monospace", fontSize: 14 }}>
          {now ? now.toLocaleString("zh-Hant-HK", { hour12: false }) : "—"}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
          天氣:placeholder(未接API)
        </div>
      </div>
      <p style={{ fontFamily: "monospace", fontSize: 13, opacity: 0.6 }}>
        之後會陸續加:油價 / 天氣警告 / 返工提示
      </p>
    </div>
  );
}
