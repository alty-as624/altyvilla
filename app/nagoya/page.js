"use client";
import { useEffect, useState } from "react";

// 名古屋座標
const LAT = 35.1815;
const LON = 136.9066;

// 愛知縣 JMA office code
const AICHI_CODE = "230000";

const OFFICIAL_STATUS = "https://www.kotsu.city.nagoya.jp/rp/emergency";

function weatherCodeToText(code) {
  if (code === 0) return "晴";
  if ([1, 2, 3].includes(code)) return "多雲";
  if ([45, 48].includes(code)) return "有霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67].includes(code)) return "雨";
  if ([71, 73, 75, 77].includes(code)) return "雪";
  if ([80, 81, 82].includes(code)) return "陣雨";
  if ([95, 96, 99].includes(code)) return "雷暴";
  return "—";
}

function statusColor(level) {
  if (level === "ok") return "#1f9d55";
  if (level === "warn") return "#d97706";
  if (level === "bad") return "#dc2626";
  return "#9ca3af";
}

export default function Nagoya() {
  const [nagoyaTime, setNagoyaTime] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [warningError, setWarningError] = useState(false);

  const [lines, setLines] = useState([]);
  const [metroMeta, setMetroMeta] = useState("載入緊…");
  const [metroError, setMetroError] = useState(false);

  // Clock: 每秒更新名古屋當地時間 (JST)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const jst = new Intl.DateTimeFormat("zh-Hant", {
        timeZone: "Asia/Tokyo",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      setNagoyaTime(jst);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 天氣：只喺 page load 嗰陣 check 一次
  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
    )
      .then((res) => res.json())
      .then((data) => setWeather(data.current))
      .catch(() => setWeatherError(true));
  }, []);

  // 災害警報：同樣只喺 load 嗰陣 check 一次
  useEffect(() => {
    fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${AICHI_CODE}.json`)
      .then((res) => res.json())
      .then((data) => {
        const found = [];
        (data.areaTypes || []).forEach((areaType) => {
          (areaType.areas || []).forEach((area) => {
            (area.warnings || []).forEach((w) => {
              if (w.status === "発表" || w.status === "継続") {
                found.push({
                  areaName: area.area?.name || "",
                  code: w.code,
                  status: w.status,
                });
              }
            });
          });
        });
        setWarnings(found);
      })
      .catch(() => setWarningError(true));
  }, []);

  // 地下鐵線況：打開 page 時 fetch 自己嘅 /api/status 一次
  const loadMetro = () => {
    setMetroError(false);
    setMetroMeta("正在 fetch 官方運行情報…");
    fetch("/api/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "fetch failed");
        setLines(data.lines || []);
        const t = data.fetchedAt
          ? new Date(data.fetchedAt).toLocaleString("zh-Hant", {
              timeZone: "Asia/Tokyo",
              hour12: false,
            })
          : "";
        setMetroMeta(
          `已更新 · 解析 ${data.parsedCount ?? "—"} 項 · ${t}（JST）· 非官方 API`
        );
      })
      .catch(() => {
        setMetroError(true);
        setMetroMeta("Fetch 失敗，請開官方頁確認");
        setLines([]);
      });
  };

  useEffect(() => {
    loadMetro();
  }, []);

  // X embed
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://platform.twitter.com/widgets.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      try {
        document.body.removeChild(s);
      } catch (_) {}
    };
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: "serif" }}>名古屋</h1>

      <div
        style={{
          background: "#1c2b2a",
          color: "#eee7d8",
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontFamily: "monospace", fontSize: 14, marginBottom: 10 }}>
          名古屋現在時間:{nagoyaTime || "—"}
        </div>
        <div style={{ fontSize: 14 }}>
          {weatherError && "天氣資料暫時攞唔到"}
          {!weatherError && !weather && "天氣載入緊…"}
          {weather && (
            <>
              {weather.temperature_2m}°C ·{" "}
              {weatherCodeToText(weather.weather_code)}
            </>
          )}
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            opacity: 0.6,
            marginTop: 6,
          }}
        >
          天氣只喺打開頁面嗰刻 check 一次，想要新資料請重新整理
        </div>
      </div>

      {warnings.length > 0 && (
        <div
          style={{
            background: "#a45a3a",
            color: "#fff",
            borderRadius: 4,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
            ⚠ 愛知縣現正生效警報
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13.5, marginBottom: 4 }}>
              {w.areaName} — {w.code}({w.status})
            </div>
          ))}
        </div>
      )}
      {warningError && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
          警報資料暫時攞唔到
        </div>
      )}

      {/* 地下鐵線況：色 pill + 圓點 + 狀態 */}
      <div
        style={{
          background: "#e2d9c5",
          border: "1px solid rgba(28,43,42,0.18)",
          borderRadius: 3,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>地下鐵運行狀況</div>
          <div style={{ fontSize: 12 }}>
            <button
              type="button"
              onClick={loadMetro}
              style={{
                background: "none",
                border: "none",
                color: "#1c2b2a",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
                fontFamily: "inherit",
                fontSize: 12,
              }}
            >
              重新 fetch
            </button>
            {" · "}
            <a
              href={OFFICIAL_STATUS}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1c2b2a", fontWeight: 600 }}
            >
              官方頁
            </a>
          </div>
        </div>

        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            opacity: 0.75,
            marginBottom: 10,
            color: metroError ? "#991b1b" : "inherit",
          }}
        >
          {metroMeta}
        </div>

        {(lines || []).map((l) => (
          <a
            key={l.key}
            href={`${OFFICIAL_STATUS}#${l.hash || ""}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderTop: "1px solid rgba(28,43,42,0.12)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span
              style={{
                minWidth: 120,
                textAlign: "center",
                borderRadius: 999,
                padding: "6px 10px",
                fontWeight: 800,
                fontSize: 13,
                background: l.color,
                color: l.textDark ? "#111" : "#fff",
              }}
            >
              {l.name}
            </span>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: statusColor(l.level),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                marginLeft: "auto",
                fontWeight: 700,
                fontSize: 13,
                color: statusColor(l.level),
              }}
            >
              {l.label}
            </span>
          </a>
        ))}

        {!metroError && lines.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>未有線況資料</div>
        )}
      </div>

      <div
        style={{
          background: "#e2d9c5",
          border: "1px solid rgba(28,43,42,0.18)",
          borderRadius: 3,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
          地下鐵/市巴士運行資訊（官方 X）
        </div>
        <a
          className="twitter-timeline"
          data-height="400"
          data-chrome="noheader nofooter noborders transparent"
          href="https://twitter.com/nagoya_kotsu"
        >
          載入緊 @nagoya_kotsu 嘅最新資訊…
        </a>
      </div>

      <p>呢度之後仲會加:名古屋 live cam</p>
    </div>
  );
}