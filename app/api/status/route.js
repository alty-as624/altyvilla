/**
 * 路徑：app/api/status/route.js
 * 打開 /api/status 會向交通局運行情報頁 fetch 一次並回傳 JSON
 */
const OFFICIAL_URL = "https://www.kotsu.city.nagoya.jp/rp/emergency";

const LINE_DEFS = [
  { key: "H", id: "H_LINE_TITLE_top", name: "東山線", en: "Higashiyama", color: "#f5c400", textDark: true, hash: "HIG" },
  { key: "M", id: "M_LINE_TITLE_top", name: "名城線・名港線", en: "Meijo / Meiko", color: "#8f2e92", textDark: false, hash: "MEI" },
  { key: "T", id: "T_LINE_TITLE_top", name: "鶴舞線", en: "Tsurumai", color: "#00a0e9", textDark: false, hash: "TSU" },
  { key: "S", id: "S_LINE_TITLE_top", name: "桜通線", en: "Sakura-dori", color: "#d01667", textDark: false, hash: "SAK" },
  { key: "K", id: "K_LINE_TITLE_top", name: "上飯田線", en: "Kamiida", color: "#e9529c", textDark: false, hash: "KAM" },
];

function classify(text, className) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  const c = (className || "").toLowerCase();
  if (c.includes("suspended") || /中止|見合わせ|運休|停止/.test(t)) {
    return { level: "bad", label: t || "運行中止" };
  }
  if (c.includes("delay") || /遅れ|遅延|ダイヤ|再開/.test(t)) {
    return { level: "warn", label: t || "運行遅れ" };
  }
  if (c.includes("normal") || /平常/.test(t)) {
    return { level: "ok", label: t || "平常運行" };
  }
  if (t) return { level: "warn", label: t };
  return { level: "unknown", label: "不明" };
}

function extractById(html, id) {
  const re = new RegExp(
    `id=["']${id}["'][^>]*class=["']([^"']*)["'][^>]*>([^<]*)<`,
    "i"
  );
  let m = html.match(re);
  if (m) return { className: m[1], text: m[2] };

  const re2 = new RegExp(
    `class=["']([^"']*)["'][^>]*id=["']${id}["'][^>]*>([^<]*)<`,
    "i"
  );
  m = html.match(re2);
  if (m) return { className: m[1], text: m[2] };

  const re3 = new RegExp(`id=["']${id}["'][^>]*>([^<]*)<`, "i");
  m = html.match(re3);
  if (m) return { className: "", text: m[1] };
  return null;
}

function parseStatus(html) {
  return LINE_DEFS.map((def) => {
    const found = extractById(html, def.id);
    const status = found
      ? classify(found.text, found.className)
      : { level: "unknown", label: "未能解析" };
    return {
      key: def.key,
      name: def.name,
      en: def.en,
      color: def.color,
      textDark: def.textDark,
      hash: def.hash,
      level: status.level,
      label: status.label,
    };
  });
}

export async function GET() {
  try {
    const r = await fetch(OFFICIAL_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NagoyaDashboard/1.0; personal-use)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      return Response.json(
        {
          ok: false,
          error: `official HTTP ${r.status}`,
          fetchedAt: new Date().toISOString(),
          source: OFFICIAL_URL,
          lines: [],
        },
        { status: 502 }
      );
    }

    const html = await r.text();
    const lines = parseStatus(html);
    const parsedCount = lines.filter((l) => l.level !== "unknown").length;

    return Response.json(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        source: OFFICIAL_URL,
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
        source: OFFICIAL_URL,
        lines: [],
      },
      { status: 500 }
    );
  }
}