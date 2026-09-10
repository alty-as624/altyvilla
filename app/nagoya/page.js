"use client";
import { useEffect, useState } from "react";

// 名古屋座標
const LAT = 35.1815;
const LON = 136.9066;

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

      <p>呢度之後仲會加:</p>
      <ul>
        <li>名古屋live cam(YouTube live embed)</li>
        <li>地下鐵 / 名鐵 / JR東海 實時運行情報</li>
      </ul>
    </div>
  );
}
