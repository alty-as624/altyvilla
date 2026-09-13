"use client";
import { useEffect, useState } from "react";

const LAT = 35.1815;
const LON = 136.9066;
const AICHI_CODE = "230000";
const NAGOYA_CITY_CODE = "2310000";

const OFFICIAL_STATUS = "https://www.kotsu.city.nagoya.jp/rp/emergency";
const JMA_WARNING_PAGE =
  "https://www.jma.go.jp/bosai/warning/#area_type=offices&area_code=230000";
const JR_SHINKANSEN_STATUS =
  "https://traininfo.jr-central.co.jp/shinkansen/pc/ja/index.html";
const CSV_URL = "/data/shinkansen-ngy-kyo.csv";

const WARN_CODE_NAME = {
  "32": "暴風雪特別警報",
  "33": "大雨特別警報",
  "35": "暴風特別警報",
  "36": "大雪特別警報",
  "37": "波浪特別警報",
  "38": "高潮特別警報",
  "02": "暴風雪警報",
  "03": "大雨警報",
  "04": "洪水警報",
  "05": "暴風警報",
  "06": "大雪警報",
  "07": "波浪警報",
  "08": "高潮警報",
  "10": "大雨注意報",
  "12": "大雪注意報",
  "13": "風雪注意報",
  "14": "雷注意報",
  "15": "強風注意報",
  "16": "波浪注意報",
  "17": "融雪注意報",
  "18": "洪水注意報",
  "19": "高潮注意報",
  "20": "濃霧注意報",
  "21": "乾燥注意報",
  "22": "雪崩注意報",
  "23": "低溫注意報",
  "24": "霜注意報",
  "25": "着氷注意報",
  "26": "着雪注意報",
  "27": "其他注意報",
};

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

function warnPriority(code) {
  const c = String(code);
  if (["32", "33", "35", "36", "37", "38"].includes(c)) return 3;
  if (["02", "03", "04", "05", "06", "07", "08"].includes(c)) return 2;
  return 1;
}

function parseWarnings(data) {
  const headline = (data.headlineText || "").trim();
  const byCode = new Map();

  (data.areaTypes || []).forEach((areaType) => {
    (areaType.areas || []).forEach((area) => {
      const areaCode = String(area.code || area.area?.code || "");
      const inNagoya = areaCode === NAGOYA_CITY_CODE;
      (area.warnings || []).forEach((w) => {
        if (w.status !== "発表" && w.status !== "継続") return;
        if (!w.code) return;
        const code = String(w.code);
        const prev = byCode.get(code);
        const priority = warnPriority(code);
        if (!prev) {
          byCode.set(code, {
            code,
            name: WARN_CODE_NAME[code] || `警報代碼 ${code}`,
            priority,
            inNagoya,
          });
        } else if (inNagoya) {
          prev.inNagoya = true;
        }
      });
    });
  });

  let list = [...byCode.values()].filter((x) => x.inNagoya);
  if (list.length === 0) {
    list = [...byCode.values()].filter((x) => x.priority >= 2);
  }
  list.sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));
  return { headline, list };
}

/** JST: weekday | saturday | holiday（日曜當 holiday；祝日未做完整表） */
function jstDayType(now = new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(now);
  if (wd === "Sat") return "saturday";
  if (wd === "Sun") return "holiday";
  return "weekday";
}

function jstMinutesNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return h * 60 + m;
}

function parseHHMM(s) {
  const [h, m] = String(s).trim().split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function dayMatches(dayField, dayType) {
  const raw = String(dayField || "")
    .toLowerCase()
    .replace(/\s/g, "");
  if (!raw || raw === "all") return true;
  const parts = raw.split("+").filter(Boolean);
  return parts.includes(dayType);
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").trim();
    });
    return row;
  });
}

function nextTrains(rows, dir, limit = 5) {
  const dayType = jstDayType();
  const nowMin = jstMinutesNow();
  return rows
    .filter((r) => r.dir === dir && dayMatches(r.day, dayType))
    .map((r) => ({ ...r, depMin: parseHHMM(r.dep) }))
    .filter((r) => r.depMin != null && r.depMin >= nowMin)
    .sort((a, b) => a.depMin - b.depMin)
    .slice(0, limit);
}

function RefreshIcon({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || "Refresh"}
      title={label || "Refresh"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        lineHeight: 1,
        fontSize: 18,
        color: "inherit",
        fontFamily: "inherit",
      }}
    >
      ↻
    </button>
  );
}

export default function Nagoya() {
  const [nagoyaTime, setNagoyaTime] = useState(null);

  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);

  const [warningHeadline, setWarningHeadline] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [warningError, setWarningError] = useState(false);

  const [lines, setLines] = useState([]);
  const [metroMeta, setMetroMeta] = useState("載入緊…");
  const [metroError, setMetroError] = useState(false);

  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState(false);
  const [shinkansenTick, setShinkansenTick] = useState(0);

  useEffect(() => {
    const tick = () => {
      const jst = new Intl.DateTimeFormat("zh-Hant", {
        timeZone: "Asia/Tokyo",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
      setNagoyaTime(jst);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 每分鐘刷新「最近五班」篩選
  useEffect(() => {
    const id = setInterval(() => setShinkansenTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const loadWeather = () => {
    setWeatherError(false);
    setWeather(null);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,precipitation_probability`
    )
      .then((res) => res.json())
      .then((data) => setWeather(data.current))
      .catch(() => setWeatherError(true));
  };

  useEffect(() => {
    loadWeather();
  }, []);

  useEffect(() => {
    fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${AICHI_CODE}.json`)
      .then((res) => res.json())
      .then((data) => {
        const { headline, list } = parseWarnings(data);
        setWarningHeadline(headline);
        setWarnings(list);
      })
      .catch(() => setWarningError(true));
  }, []);

  const loadMetro = () => {
    setMetroError(false);
    setMetroMeta("載入緊…");
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
        setMetroMeta(`Last update : ${t}`);
      })
      .catch(() => {
        setMetroError(true);
        setMetroMeta("Last update : —（失敗）");
        setLines([]);
      });
  };

  useEffect(() => {
    loadMetro();
  }, []);

  useEffect(() => {
    fetch(CSV_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("csv missing");
        return res.text();
      })
      .then((text) => setCsvRows(parseCsv(text)))
      .catch(() => setCsvError(true));
  }, []);

  const hasAlert = warnings.some((w) => w.priority >= 2);
  const hasSpecial = warnings.some((w) => w.priority >= 3);

  // shinkansenTick：每分鐘重算
  void shinkansenTick;
  const toKyo = nextTrains(csvRows, "ngy_kyo", 5);
  const toNgy = nextTrains(csvRows, "kyo_ngy", 5);

  const card = {
    background: "#e2d9c5",
    border: "1px solid rgba(28,43,42,0.18)",
    borderRadius: 3,
    padding: "14px 16px",
    marginBottom: 16,
  };

  function TrainList({ title, rows }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
          {title}
        </div>
        {rows.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>今日已無班次（或表未涵蓋）</div>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.dep}-${r.train}-${i}`}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13.5,
                padding: "4px 0",
                borderTop: i === 0 ? "1px solid rgba(28,43,42,0.12)" : undefined,
                borderBottom: "1px solid rgba(28,43,42,0.08)",
                fontFamily: "monospace",
              }}
            >
              <span style={{ minWidth: 48 }}>{r.dep}</span>
              <span style={{ opacity: 0.7 }}>→</span>
              <span style={{ minWidth: 48 }}>{r.arr}</span>
              <span>{r.train}</span>
              <span style={{ marginLeft: "auto", opacity: 0.75 }}>{r.dest}</span>
            </div>
          ))
        )}
      </div>
    );
  }

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div style={{ fontFamily: "monospace", fontSize: 14, marginBottom: 10 }}>
            名古屋現在時間:{nagoyaTime || "—"}
          </div>
          <RefreshIcon onClick={loadWeather} label="Refresh 天氣" />
        </div>
        <div style={{ fontSize: 14 }}>
          {weatherError && "天氣資料暫時攞唔到"}
          {!weatherError && !weather && "天氣載入緊…"}
          {weather && (
            <>
              {weather.temperature_2m}°C
              {weather.apparent_temperature != null && (
                <> · 體感 {weather.apparent_temperature}°C</>
              )}
              {" · "}
              {weatherCodeToText(weather.weather_code)}
              {weather.precipitation_probability != null && (
                <> · 降水 {weather.precipitation_probability}%</>
              )}
            </>
          )}
        </div>
      </div>

      {(warningHeadline || warnings.length > 0) && (
        <div
          style={{
            background: hasAlert ? "#a45a3a" : "#8a7355",
            color: "#fff",
            borderRadius: 4,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>
            {hasSpecial
              ? "⚠ 特別警報（名古屋重點）"
              : hasAlert
                ? "⚠ 警報（名古屋重點）"
                : "注意報（名古屋）"}
          </div>
          {warningHeadline && (
            <div style={{ fontSize: 13.5, marginBottom: 8, lineHeight: 1.45 }}>
              {warningHeadline}
            </div>
          )}
          {warnings.map((w) => (
            <div key={w.code} style={{ fontSize: 13.5, marginBottom: 4 }}>
              {w.name}
              {w.priority >= 2 ? "（警報級）" : "（注意報）"}
            </div>
          ))}
          <a
            href={JMA_WARNING_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fff", fontSize: 12, opacity: 0.9 }}
          >
            氣象廳詳情 →
          </a>
        </div>
      )}
      {warningError && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
          警報資料暫時攞唔到
        </div>
      )}
      {!warningError && !warningHeadline && warnings.length === 0 && (
        <div style={{ ...card, fontSize: 13.5 }}>
          名古屋市而家未見需要顯示嘅警報／注意報
        </div>
      )}

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>地下鉄運行狀況</div>
          <RefreshIcon onClick={loadMetro} label="Refresh 地下鉄" />
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
            href={OFFICIAL_STATUS}
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

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            新幹線（名古屋 ↔ 京都）· 最近五班
          </div>
          <a
            href={JR_SHINKANSEN_STATUS}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#1c2b2a", fontWeight: 600 }}
          >
            JR運行狀況
          </a>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
          來自自備時刻表 · 唔反映延誤 · day：平日／土曜／休日（日＝休日）
        </div>
        {csvError && (
          <div style={{ fontSize: 13, color: "#991b1b" }}>
            讀唔到 {CSV_URL}，請確認已放喺 public/data/
          </div>
        )}
        {!csvError && (
          <>
            <TrainList title="名古屋 → 京都" rows={toKyo} />
            <TrainList title="京都 → 名古屋" rows={toNgy} />
          </>
        )}
      </div>

      <div style={{ ...card, fontSize: 13.5, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
          其他官方入口
        </div>
        <div>
          <a
            href={OFFICIAL_STATUS}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1c2b2a" }}
          >
            交通局運行情報
          </a>
          {" · "}
          <a
            href={JMA_WARNING_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1c2b2a" }}
          >
            氣象廳警報
          </a>
          {" · "}
          <a
            href="https://www.city.nagoya.jp/bousaiportal/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1c2b2a" }}
          >
            名古屋市防災
          </a>
          {" · "}
          <a
            href="https://twitter.com/nagoya_kotsu"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1c2b2a" }}
          >
            @nagoya_kotsu
          </a>
        </div>
      </div>
    </div>
  );
}