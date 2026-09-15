// app/api/man_metrolink/route.js
// Metrolink 月台顯示屏 data source：bustimes.org（同 man_bus 用緊嗰個一樣）
// 冇key、唔使login，公開JSON endpoint

const STOPS = [
  {
    id: "altrincham",
    label: "Altrincham",
    subtitle: "→ 市中心",
    atco: "9400ZZMAALT1",
  },
  {
    id: "deansgate",
    label: "Deansgate",
    subtitle: "→ Altrincham",
    // Deansgate-Castlefield「離開市中心」方向嗰個platform，Green/Purple Line
    // 由呢度出發嘅車一定係去Altrincham（一線到底，唔使再篩destination）
    atco: "9400ZZMAGMX3",
  },
];

const ALLOWED_LINES = ["Green Line", "Purple Line"];
const MAX_RESULTS = 5;

async function fetchTimes(atco, limit) {
  const url = `https://bustimes.org/stops/${atco}/times.json?limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`bustimes.org 回應 ${res.status}`);
  const data = await res.json();
  return data.times || [];
}

function pickTime(item) {
  return item.expected_departure_time || item.aimed_departure_time;
}

async function fetchStop(stop) {
  const now = new Date();
  let filtered = [];

  for (const limit of [20, 40, 80]) {
    const times = await fetchTimes(stop.atco, limit);
    filtered = times
      .filter((t) => ALLOWED_LINES.includes(t.service?.line_name))
      .sort((a, b) => new Date(pickTime(a)) - new Date(pickTime(b)));
    if (filtered.length >= MAX_RESULTS) break;
  }

  const trams = filtered.slice(0, MAX_RESULTS).map((t) => {
    const effectiveTime = new Date(pickTime(t));
    const waitMinutes = Math.max(0, Math.round((effectiveTime - now) / 60000));
    return {
      line: t.service.line_name,
      destination: t.destination?.name || "",
      waitMinutes,
      isRealtime: Boolean(t.expected_departure_time),
    };
  });

  return {
    id: stop.id,
    label: stop.label,
    subtitle: stop.subtitle,
    trams,
    closed: trams.length === 0,
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const boards = await Promise.all(STOPS.map(fetchStop));
  return Response.json({ boards, updatedAt: new Date().toISOString() });
}
