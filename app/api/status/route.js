/**
 * 路徑：app/api/status/route.js
 * 資料來源：交通局 latest_traffic.json（正式線況，唔係網頁示範 badge）
 */
const TRAFFIC_URL = "https://www.kotsu.city.nagoya.jp/datas/latest_traffic.json";

const LINE_DEFS = [
  { key: "H", rosen: "H_LINE", name: "東山線", en: "Higashiyama", color: "#f5c400", textDark: true, hash: "HIG" },
  { key: "M", rosen: "M_LINE", name: "名城線・名港線", en: "Meijo / Meiko", color: "#8f2e92", textDark: false, hash: "MEI" },
  { key: "T", rosen: "T_LINE", name: "鶴舞線", en: "Tsurumai", color: "#00a0e9", textDark: false, hash: "TSU" },
  { key: "S", rosen: "S_LINE", name: "桜通線", en: "Sakura-dori", color: "#d01667", textDark: false, hash: "SAK" },
  { key: "K", rosen: "K_LINE", name: "上飯田線", en: "Kamiida", color: "#e9529c", textDark: false, hash: "KAM" },
];

function classify(item) {
  const title = (item.traffic_title || "").trim();
  const icon = (item.icon_cd || "").toUpperCase();

  // N_T_ICO = 平常；其他 icon 視 title 判斷
  if (icon === "N_T_ICO" || /平常/.test(title)) {
    return { level: "ok", label: title || "平常運行" };
  }
  if (/中止|見合わせ|運休|停止/.test(title)) {
    return { level: "bad", label: title || "運行中止" };
  }
  if (/遅れ|遅延|ダイヤ|再開/.test(title)) {
    return { level: "warn", label: title || "運行遅れ" };
  }
  if (title) return { level: "warn", label: title };
  return { level: "unknown", label: "不明" };
}

export async function GET() {
  try {
    const r = await fetch(TRAFFIC_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NagoyaDashboard/1.0; personal-use)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      return Response.json(
        {
          ok: false,
          error: `traffic JSON HTTP ${r.status}`,
          fetchedAt: new Date().toISOString(),
          source: TRAFFIC_URL,
          lines: [],
        },
        { status: 502 }
      );
    }

    const data = await r.json();
    const byRosen = new Map();
    for (const row of data) {
      // 同一線可能有多 slot；用 traffic_no 較新／先出現都得，呢度後寫覆蓋前寫
      byRosen.set(row.rosen_id, row);
    }

    const lines = LINE_DEFS.map((def) => {
      const row = byRosen.get(def.rosen);
      if (!row) {
        return {
          key: def.key,
          name: def.name,
          en: def.en,
          color: def.color,
          textDark: def.textDark,
          hash: def.hash,
          level: "unknown",
          label: "未能解析",
        };
      }
      const status = classify(row);
      return {
        key: def.key,
        name: def.name,
        en: def.en,
        color: def.color,
        textDark: def.textDark,
        hash: def.hash,
        level: status.level,
        label: status.label,
        message: row.traffic_message || "",
        updated: row.create_datetime || null,
      };
    });

    const parsedCount = lines.filter((l) => l.level !== "unknown").length;

    return Response.json(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        source: TRAFFIC_URL,
        parsedCount,
        lines,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: String(e && e.message ? e.message : e),
        fetchedAt: new Date().toISOString(),
        source: TRAFFIC_URL,
        lines: [],
      },
      { status: 500 }
    );
  }
}