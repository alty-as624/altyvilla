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

// 統一嘅monospace字體，確保Windows/Mac/Linux睇落都一致
const MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

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
  const [trafficData, setTrafficData] = useState({ status: "loading" });
  const [metrolink, setMetrolink] = useState({ status: "loading" });
  const [bus, setBus] = useState({ status: "loading" });
  const [fuel, setFuel] = useState({ status: "loading" });

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

  // 路況（固定路線 ETA）
  useEffect(() => {
    fetch("/api/man_traffic")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setTraffic({ status: "error", message: data.error });
        else setTraffic({ status: "ok", routes: data.routes });
      })
      .catch(() => setTraffic({ status: "error", message: "攞路況資料失敗" }));
  }, []);

  // Traffic Data（探針位，固定次序）
  const fetchTrafficData = () => {
    setTrafficData((prev) => ({
      ...prev,
      status: prev.status === "ok" ? "refreshing" : "loading",
    }));
    fetch("/api/man_traffic_data")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setTrafficData({ status: "error", message: data.error });
        } else {
          setTrafficData({
            status: "ok",
            points: data.points,
            updatedAt: data.updatedAt,
          });
        }
      })
      .catch(() => setTrafficData({ status: "error", message: "攞 Traffic Data 失敗" }));
  };

  useEffect(() => {
    fetchTrafficData();
  }, []);

  // Metrolink
  const fetchMetrolink = () => {
    setMetrolink((prev) => ({ ...prev, status: prev.status === "ok" ? "refreshing" : "loading" }));
    fetch("/api/man_metrolink")
      .then((res) => res.json())
      .then((data) => setMetrolink({ status: "ok", ...data }))
      .catch(() => setMetrolink({ status: "error", message: "攞Metrolink資料失敗" }));
  };

  useEffect(() => {
    fetchMetrolink();
    const id = setInterval(fetchMetrolink, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // 巴士
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

  // 油價（經自己 API）
  const fetchFuel = () => {
    setFuel((prev) => ({ ...prev, status: prev.status === "ok" ? "refreshing" : "loading" }));
    fetch("/api/uk_fuel")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setFuel({ status: "error", message: data.error });
        } else {
          setFuel({
            status: "ok",
            stations: data.stations,
            cheapest: data.cheapest,
            updatedAt: data.updatedAt,
          });
        }
      })
      .catch(() => setFuel({ status: "error", message: "攞油價資料失敗" }));
  };

  useEffect(() => {
    fetchFuel();
  }, []);

  const w = weather.status === "ok" ? describeWeather(weather.current?.weather_code) : null;

  // 統一 refresh 掣樣式（箭咀）
  const refreshBtnStyle = {
    fontSize: 14,
    fontFamily: MONO,
    color: "#1c2b2a",
    background: "transparent",
    border: "1px solid #1c2b2a",
    borderRadius: 3,
    padding: "2px 8px",
    cursor: "pointer",
    lineHeight: 1,
  };

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
        <div style={{ fontFamily: MONO, fontSize: 14 }}>
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
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700 }}>
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
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: MONO }}>
                    {r.error}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: MONO }}>
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
                      fontFamily: MONO,
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

      {/* Traffic Data — 探針位，固定次序 */}
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
          <div style={{ fontWeight: 700, fontSize: 14 }}>Traffic Data</div>
          <button onClick={fetchTrafficData} style={refreshBtnStyle} title="重新整理">
            {trafficData.status === "refreshing" ? "…" : "↻"}
          </button>
        </div>

        {trafficData.status === "loading" && (
          <div style={{ fontSize: 13, opacity: 0.7, fontFamily: MONO }}>讀緊...</div>
        )}
        {trafficData.status === "error" && (
          <div style={{ fontSize: 13, color: "#c96a54", fontFamily: MONO }}>
            {trafficData.message}
          </div>
        )}

        {(trafficData.status === "ok" || trafficData.status === "refreshing") &&
          trafficData.points?.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderTop: i === 0 ? "none" : "1px solid rgba(28,43,42,0.15)",
                fontSize: 13,
                fontFamily: MONO,
              }}
            >
              <span>{p.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    color: p.color || "#999",
                    lineHeight: 1,
                    fontSize: 13,
                  }}
                >
                  ●
                </span>
                <span
                  style={{
                    minWidth: 36,
                    color: p.color || "#1c2b2a",
                    fontWeight: 600,
                  }}
                >
                  {p.status}
                </span>
                <span style={{ minWidth: 52, textAlign: "right" }}>
                  {p.currentSpeed != null ? `${p.currentSpeed} mph` : "—"}
                </span>
              </div>
            </div>
          ))}

        {trafficData.updatedAt && (
          <div
            style={{
              fontSize: 10,
              color: "#1c2b2a",
              opacity: 0.5,
              fontFamily: MONO,
              marginTop: 10,
            }}
          >
            更新於{" "}
            {new Date(trafficData.updatedAt).toLocaleTimeString("zh-Hant-HK", {
              hour12: false,
            })}
          </div>
        )}
      </div>

      {/* Metrolink */}
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
          <div style={{ fontWeight: 700, fontSize: 14 }}>Metrolink</div>
          <button onClick={fetchMetrolink} style={refreshBtnStyle} title="重新整理">
            {metrolink.status === "refreshing" ? "…" : "↻"}
          </button>
        </div>

        {metrolink.status === "loading" && (
          <div style={{ fontFamily: MONO, fontSize: 13, color: "#1c2b2a", opacity: 0.7 }}>
            讀緊班次...
          </div>
        )}
        {metrolink.status === "error" && (
          <div style={{ fontFamily: MONO, fontSize: 13, color: "#c96a54" }}>
            {metrolink.message}
          </div>
        )}

        {(metrolink.status === "ok" || metrolink.status === "refreshing") && (
          <div style={{ display: "grid", gap: 10 }}>
            {metrolink.boards?.map((board) => (
              <div
                key={board.id}
                style={{
                  background: "#0d1210",
                  borderRadius: 3,
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, color: "#eee7d8", fontWeight: 500 }}>
                    {board.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#7fb8a4", fontFamily: MONO }}>
                    {board.subtitle}
                  </span>
                </div>
                {board.closed && (
                  <div style={{ fontFamily: MONO, fontSize: 14, color: "#e8b84b" }}>
                    咁夜，收咗車啦！
                  </div>
                )}
                {!board.closed &&
                  board.trams.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: MONO,
                        color: "#e8b84b",
                        fontSize: 15,
                        padding: "2px 0",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.destination}
                      </span>
                      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {t.waitMinutes} 分鐘
                      </span>
                    </div>
                  ))}
              </div>
            ))}
            {metrolink.updatedAt && (
              <div style={{ fontSize: 10, color: "#1c2b2a", opacity: 0.5, fontFamily: MONO }}>
                更新於{" "}
                {new Date(metrolink.updatedAt).toLocaleTimeString("zh-Hant-HK", {
                  hour12: false,
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 巴士 */}
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
          <button onClick={fetchBus} style={refreshBtnStyle} title="重新整理">
            {bus.status === "refreshing" ? "…" : "↻"}
          </button>
        </div>

        <div style={{ background: "#0d1210", borderRadius: 3, padding: "10px 14px" }}>
          {bus.status === "loading" && (
            <div style={{ fontFamily: MONO, fontSize: 13, color: "#7fb8a4" }}>
              讀緊班次...
            </div>
          )}
          {bus.status === "error" && (
            <div style={{ fontFamily: MONO, fontSize: 13, color: "#c96a54" }}>
              {bus.message}
            </div>
          )}
          {(bus.status === "ok" || bus.status === "refreshing") && bus.closed && (
            <div style={{ fontFamily: MONO, fontSize: 14, color: "#e8b84b" }}>
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
                  fontFamily: MONO,
                  fontSize: 15,
                  padding: "3px 0",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    minWidth: 32,
                    color: "#eee7d8",
                    fontWeight: 700,
                  }}
                >
                  {b.line}
                </span>
                <span style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 22,
                      textAlign: "right",
                      color: "#e8b84b",
                    }}
                  >
                    {b.waitMinutes}
                  </span>
                  <span style={{ color: "#e8b84b", marginLeft: 4 }}>分鐘</span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 34,
                      fontSize: 10,
                      color: "#7fb8a4",
                      marginLeft: 5,
                      textAlign: "left",
                    }}
                  >
                    {!b.isRealtime ? "預定" : ""}
                  </span>
                </span>
              </div>
            ))}
          {bus.updatedAt && (
            <div style={{ fontSize: 10, color: "#7fb8a4", fontFamily: MONO, marginTop: 8 }}>
              更新於 {new Date(bus.updatedAt).toLocaleTimeString("zh-Hant-HK", { hour12: false })}
            </div>
          )}
        </div>
      </div>

      {/* 油價 */}
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
          <div style={{ fontWeight: 700, fontSize: 14 }}>油價</div>
          <button onClick={fetchFuel} style={refreshBtnStyle} title="重新整理">
            {fuel.status === "refreshing" ? "…" : "↻"}
          </button>
        </div>

        {fuel.status === "loading" && (
          <div style={{ fontSize: 13, opacity: 0.7, fontFamily: MONO }}>讀緊油價...</div>
        )}
        {fuel.status === "error" && (
          <div style={{ fontSize: 13, color: "#c96a54", fontFamily: MONO }}>{fuel.message}</div>
        )}

        {(fuel.status === "ok" || fuel.status === "refreshing") && (
          <div>
            {fuel.stations.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "7px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(28,43,42,0.15)",
                }}
              >
                {/* 左邊：站名 */}
                <span style={{ fontSize: 13, minWidth: 0 }}>{s.label}</span>

                {/* 右邊：平 + 價錢（右對齊） */}
                <div
                  style={{
                    textAlign: "right",
                    flexShrink: 0,
                    marginLeft: 12,
                    fontFamily: MONO,
                  }}
                >
                  {s.error ? (
                    <span style={{ fontSize: 13, color: "#c96a54" }}>{s.error}</span>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "flex-end",
                          gap: 6,
                        }}
                      >
                        {fuel.cheapest != null && s.e10 === fuel.cheapest && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#7fb8a4",
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            平
                          </span>
                        )}
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#1c2b2a" }}>
                          {s.e10 != null ? `${s.e10.toFixed(1)}p` : "—"}
                        </span>
                      </div>
                      {s.diesel != null && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#1c2b2a",
                            opacity: 0.55,
                            marginTop: 1,
                          }}
                        >
                          柴油 {s.diesel.toFixed(1)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {fuel.updatedAt && (
              <div
                style={{
                  fontSize: 10,
                  color: "#1c2b2a",
                  opacity: 0.5,
                  fontFamily: MONO,
                  marginTop: 10,
                }}
              >
                更新於{" "}
                {new Date(fuel.updatedAt).toLocaleTimeString("zh-Hant-HK", { hour12: false })}
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ fontFamily: MONO, fontSize: 13, opacity: 0.6 }}>
        之後會陸續加:天氣警告 / 返工提示
      </p>
    </div>
  );
}
