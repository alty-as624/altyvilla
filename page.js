"use client";
import { useEffect, useState } from "react";

// 名古屋座標
const LAT = 35.1815;
const LON = 136.9066;

// 愛知縣 JMA office code
const AICHI_CODE = "230000";

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

export default function Nagoya() {
  const [nagoyaTime, setNagoyaTime] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [warningError, setWarningError] = useState(false);

  // Clock: 每秒更新名古屋當地時間(JST)
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

  // 天氣:只喺page load嗰陣check一次,唔會自動refresh
  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`
    )
      .then((res) => res.json())
      .then((data) => setWeather(data.current))
      .catch(() => setWeatherError(true));
  }, []);

  // 災害警報:同樣只喺load嗰陣check一次
  // 資料來源:JMA(気象庁)公開嘅warning JSON,唔使API key
  // 呢個endpoint冇正式官方文件,係普遍使用嘅慣例URL,格式日後有機會變
  useEffect(() => {
    fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${AICHI_CODE}.json`)
      .then((res) => res.json())
      .then((data) => {
        const found = [];
        (data.areaTypes || []).forEach((areaType) => {
          (areaType.areas || []).forEach((area) => {
            (area.warnings || []).forEach((w) => {
              // status "発表" = 現正生效, "解除" = 已解除
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
        <div style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.6, marginTop: 6 }}>
          天氣只喺打開頁面嗰刻check一次,想要新資料請重新整理
        </div>
      </div>

      {/* 災害警報:得有效warning先會顯示呢張card */}
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
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>⚠ 愛知縣現正生效警報</div>
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

      {/* 地下鐵運行資訊:embed名古屋市交通局官方X帳號 */}
      <div
        style={{
          background: "#e2d9c5",
          border: "1px solid rgba(28,43,42,0.18)",
          borderRadius: 3,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: "600", fontSize: 14, marginBottom: 10 }}>
          地下鐵/市巴士運行資訊
        </div>
        <a
          className="twitter-timeline"
          data-height="400"
          data-chrome="noheader nofooter noborders transparent"
          href="https://twitter.com/nagoya_kotsu"
        >
          載入緊 @nagoya_kotsu 嘅最新資訊…
        </a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </div>

      <p>呢度之後仲會加:名古屋live cam</p>
    </div>
  );
}
