"use client";
import { useEffect, useState } from "react";

// Open-Meteo 天氣代碼 → 中文描述 + icon（簡化版，夠用就得）
function describeWeather(code) {
  if (code === 0) return { text: "天晴", icon: "☀️" };
  if ([1, 2].includes(code)) return { text: "多雲", icon: "🌤️" };
  if (code === 3) return { text: "陰天", icon: "☁️" };
  if ([45, 48].includes(code)) return { text: "有霧", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "毛毛雨", icon: "🌦️" };
  if ([61, 63, 65, 80, 81, 82].includes(code)) return { text: "落雨", icon: "🌧️" };
  if ([66, 67].includes(code)) return { text: "凍雨", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "落雪", icon: "❄️" };
  if ([95, 96, 99].includes(code)) return { text: "有雷暴", icon: "⛈️" };
  return { text: "—", icon: "—" };
}

function congestionColor(level) {
  if (level === "暢通") return "#7fb8a4";
  if (level === "頗塞") return "#d9a441";
  return "#c96a54";
}

function congestionBarWidth(level) {
  if (level === "暢通") return "25%";
  if (level === "頗塞") return "60%";
  return "90%";
}

export default function UK() {
  const [now, setNow] = useState(null);
  const [weather, setWeather] = useState({ status: "loading" });
  const [traffic, setTraffic] = useState({ status: "loading" });
  const [bus, setBus] = useState({ status: "loading" });

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // 天氣：GPS 定位 + Open-Meteo
  useEffect(() => {
    if (!navigator.geolocation) {
      setWeather({ status: "error", message: "呢個瀏覽器唔支援定位" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code`;
          const res = await fetch(url);
          const data = await res.json();
          setWeather({ status: "ok", current: data.current });
        } catch (e) {
          setWeather({ status: "error", message: "攞天氣資料失敗" });
        }
      },
      () => setWeather({ status: "error", message: "未畀定位權限" })
    );
  }, []);

  // 路況：fetch 自己個 API route
  useEffect(() => {
    fetch("/api/man_traffic")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setTraffic({ status: "error", message: data.error });
        else setTraffic({ status: "ok", routes: data.routes });
      })
      .catch(() => setTraffic({ status: "error", message: "攞路況資料失敗" }));
  }, []);

  // 巴士站顯示屏：fetch 自己個 API route，每 60 秒自動refresh
  const fetchBus = () => {
    setBus((prev) => ({ ...prev, status: prev.status === "ok" ? "refreshing" : "loading" }));
    fetch("/api/man_bus")
      .then((res) => res.json())
      .then((data) => setBus({ status: "ok", ...data }))
      .catch(() => setBus({ status: "error", message: "攞巴士資料失敗" }));
  };

  useEffect(() => {
    fetchBus();
    const id = setInterval(fetchBus, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const w = weather.status === "ok" ? describeWeather(weather.current?.weather_code) : null;

  return (
    <div>
      <h1 style={{ fontFamily: "serif" }}>英國</h1>

      {/* 時鐘 + 天氣 */}
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

        {weather.status === "loading" && (
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>天氣:讀緊定位...</div>
        )}
        {weather.status === "error" && (
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>天氣:{weather.message}</div>
        )}
        {weather.status === "ok" && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 30 }}>{w.icon}</span>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700 }}>
                {Math.round(weather.current.temperature_2m)}°C
                <span style={{ fontSize: 13, opacity: 0.7, marginLeft: 8, fontWeight: 400 }}>
                  {w.text}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                體感 {Math.round(weather.current.apparent_temperature)}°C ·
                落雨機率 {weather.current.precipitation_probability}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 路況 */}
      <div
        style={{
          border: "1.5px solid #1c2b2a",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>路況</div>

        {traffic.status === "loading" && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>讀緊路況...</div>
        )}
        {traffic.status === "error" && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>路況:{traffic.message}</div>
        )}
        {traffic.status === "ok" &&
          traffic.routes.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid rgba(28,43,42,0.2)",
              }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{r.label}</div>
                {r.error ? (
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
                    {r.error}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
                    {r.etaMinutes} 分鐘（正常 {r.normalMinutes} 分鐘）
                  </div>
                )}
              </div>
              {!r.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      background: "rgba(28,43,42,0.15)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: congestionBarWidth(r.congestionLevel),
                        height: "100%",
                        background: congestionColor(r.congestionLevel),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: congestionColor(r.congestionLevel),
                      fontWeight: 700,
                      width: 46,
                      textAlign: "right",
                    }}
                  >
                    {r.congestionLevel}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Metrolink 月台顯示屏 */}
      <div
        style={{
          border: "1.5px solid #1c2b2a",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
          Metrolink
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.5, marginLeft: 8 }}>
            示意畫面，未接駁真實data
          </span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {[
            { title: "Altrincham → 市中心", trams: [
              { dest: "Bury", wait: "3" },
              { dest: "Piccadilly", wait: "9" },
              { dest: "Bury", wait: "17" },
            ] },
            { title: "St Peter's Square → Altrincham", trams: [
              { dest: "Altrincham", wait: "2" },
              { dest: "Altrincham", wait: "14" },
              { dest: "Altrincham", wait: "26" },
            ] },
          ].map((board) => (
            <div
              key={board.title}
              style={{
                background: "#0d1210",
                borderRadius: 3,
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#7fb8a4",
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                {board.title}
              </div>
              {board.trams.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "monospace",
                    color: "#e8b84b",
                    fontSize: 15,
                    padding: "2px 0",
                  }}
                >
                  <span>{t.dest}</span>
                  <span>{t.wait} 分鐘</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 巴士站顯示屏 */}
      <div
        style={{
          border: "1.5px solid #1c2b2a",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            巴士
            {bus.stopName && (
              <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6, marginLeft: 8 }}>
                {bus.stopName}
              </span>
            )}
          </div>
          <button
            onClick={fetchBus}
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "#1c2b2a",
              background: "transparent",
              border: "1px solid #1c2b2a",
              borderRadius: 3,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {bus.status === "refreshing" ? "更新緊..." : "重新整理"}
          </button>
        </div>

        <div style={{ background: "#0d1210", borderRadius: 3, padding: "10px 14px" }}>
          {(bus.status === "loading") && (
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "#7fb8a4" }}>
              讀緊班次...
            </div>
          )}
          {bus.status === "error" && (
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "#c96a54" }}>
              {bus.message}
            </div>
          )}
          {(bus.status === "ok" || bus.status === "refreshing") && bus.closed && (
            <div style={{ fontFamily: "monospace", fontSize: 14, color: "#e8b84b" }}>
              {bus.message}
            </div>
          )}
          {(bus.status === "ok" || bus.status === "refreshing") &&
            !bus.closed &&
            bus.buses?.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "monospace",
                  fontSize: 15,
                  padding: "3px 0",
                }}
              >
                <span style={{ color: "#e8b84b" }}>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: 28,
                      color: "#eee7d8",
                      fontWeight: 700,
                    }}
                  >
                    {b.line}
                  </span>{" "}
                  {b.destination}
                </span>
                <span style={{ color: "#e8b84b" }}>
                  {b.waitMinutes} 分鐘
                  {!b.isRealtime && (
                    <span style={{ fontSize: 10, color: "#7fb8a4", marginLeft: 5 }}>預定</span>
                  )}
                </span>
              </div>
            ))}
          {bus.updatedAt && (
            <div style={{ fontSize: 10, color: "#7fb8a4", fontFamily: "monospace", marginTop: 8 }}>
              更新於 {new Date(bus.updatedAt).toLocaleTimeString("zh-Hant-HK", { hour12: false })}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontFamily: "monospace", fontSize: 13, opacity: 0.6 }}>
        之後會陸續加:油價 / 天氣警告 / 返工提示
      </p>
    </div>
  );
}
