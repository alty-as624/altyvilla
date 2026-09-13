// app/api/man_traffic/route.js
// 攞你幾條 route 嘅實時交通狀況（用 TomTom Routing API，免卡免費額度 2500/日）
// 記得喺 .env.local 加：TOMTOM_API_KEY=你嘅key

const POINTS = {
  m56_j4: { lat: 53.38164066504371, lon: -2.278147464508875 },
  greenheys_lane: { lat: 53.46245423208374, lon: -2.2449288097859017 },
  m60_j24_denton: { lat: 53.45689775933654, lon: -2.1361685906821593 },
  a560_woodlands_parkway: { lat: 53.3912390085148, lon: -2.3412540631629435 },
};

const ROUTES = [
  {
    id: "A",
    label: "路線 A · M56 → A5103 → Greenheys Lane",
    from: POINTS.m56_j4,
    to: POINTS.greenheys_lane,
  },
  {
    id: "B1",
    label: "路線 B1 · M56 J4 → M56(E) → M60 J24",
    from: POINTS.m56_j4,
    to: POINTS.m60_j24_denton,
  },
  {
    id: "B2",
    label: "路線 B2 · A560/Woodlands Parkway → M60 J24",
    from: POINTS.a560_woodlands_parkway,
    to: POINTS.m60_j24_denton,
  },
];

// 用正常行車時間 vs 加咗實時交通嘅時間，計返個「塞車程度」
function classifyCongestion(normalSeconds, trafficSeconds) {
  const ratio = trafficSeconds / normalSeconds;
  if (ratio < 1.15) return { level: "暢通", ratioPct: Math.round((ratio - 1) * 100) };
  if (ratio < 1.4) return { level: "頗塞", ratioPct: Math.round((ratio - 1) * 100) };
  return { level: "大塞車", ratioPct: Math.round((ratio - 1) * 100) };
}

async function fetchRoute(route, apiKey) {
  const coords = `${route.from.lat},${route.from.lon}:${route.to.lat},${route.to.lon}`;
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${apiKey}&traffic=true&travelMode=car`;

  const res = await fetch(url);
  const data = await res.json();

  const summary = data.routes?.[0]?.summary;
  if (!summary) {
    return { id: route.id, label: route.label, error: data.error?.description || "NO_ROUTE" };
  }

  const trafficSeconds = summary.travelTimeInSeconds;
  const delaySeconds = summary.trafficDelayInSeconds ?? 0;
  const normalSeconds = trafficSeconds - delaySeconds;
  const congestion = classifyCongestion(normalSeconds || trafficSeconds, trafficSeconds);

  return {
    id: route.id,
    label: route.label,
    etaMinutes: Math.round(trafficSeconds / 60),
    normalMinutes: Math.round((normalSeconds || trafficSeconds) / 60),
    congestionLevel: congestion.level,
    delayPct: congestion.ratioPct,
  };
}

export async function GET() {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "未設定 TOMTOM_API_KEY" }, { status: 500 });
  }

  const results = await Promise.all(ROUTES.map((r) => fetchRoute(r, apiKey)));
  return Response.json({ routes: results, updatedAt: new Date().toISOString() });
}