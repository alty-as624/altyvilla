// app/api/man_bus/route.js
// 巴士站顯示屏 data source：bustimes.org（英國Bus Open Data Service嘅前端）
// 冇key、唔使login，公開JSON endpoint

const STOP_CODE = "1800SB04971";
// 想顯示嘅站名，bustimes 個 times.json 冇提供站名，自己填返
const STOP_NAME = "站名待填"; // TODO: 填返你屋企附近嗰個站嘅實際名

const ALLOWED_LINES = ["41", "42", "43", "111", "142", "143"];
const MAX_RESULTS = 5;

async function fetchTimes(limit) {
  const url = `https://bustimes.org/stops/${STOP_CODE}/times.json?limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`bustimes.org 回應 ${res.status}`);
  const data = await res.json();
  return data.times || [];
}

function pickTime(item) {
  // 有 expected（real-time）就用嗰個，冇就跌返去用 aimed（時刻表原定）
  return item.expected_departure_time || item.aimed_departure_time;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  let filtered = [];

  // limit 逐級加大，直到夠 5 班（或者撞到上限就放棄）
  for (const limit of [20, 40, 80]) {
    const times = await fetchTimes(limit);
    filtered = times
      .filter((t) => ALLOWED_LINES.includes(t.service?.line_name))
      .sort((a, b) => new Date(pickTime(a)) - new Date(pickTime(b)));
    if (filtered.length >= MAX_RESULTS) break;
  }

  if (filtered.length === 0) {
    return Response.json({
      stopName: STOP_NAME,
      updatedAt: now.toISOString(),
      closed: true,
      message: "咁夜，收咗車啦！",
      buses: [],
    });
  }

  const buses = filtered.slice(0, MAX_RESULTS).map((t) => {
    const effectiveTime = new Date(pickTime(t));
    const waitMinutes = Math.max(0, Math.round((effectiveTime - now) / 60000));
    return {
      line: t.service.line_name,
      destination: t.destination?.name || "",
      waitMinutes,
      isRealtime: Boolean(t.expected_departure_time),
    };
  });

  return Response.json({
    stopName: STOP_NAME,
    updatedAt: now.toISOString(),
    closed: false,
    buses,
  });
}
