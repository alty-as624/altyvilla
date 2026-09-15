// app/api/man_traffic/route.js
// 攞你幾條 route 嘅實時交通狀況（用 TomTom Routing API，免卡免費額度 2500/日）
// 記得喺 .env.local / Vercel Environment Variables 加：TOMTOM_API_KEY=你嘅key
//
// 每條 route 用返實際揸嘅 waypoint 順序去逼 TomTom 跟住條真實路徑計，
// 唔會俾佢自己揀第二條「佢認為快」嘅路。

const ORIGIN = { lat: 53.38488544600108, lon: -2.3403599038960023 }; // 出發點（屋企）

const ROUTE_A_POINTS = [
  ORIGIN,
  { lat: 53.380997501697195, lon: -2.329407156562963 }, // Grove Lane 1
  { lat: 53.38105712696837, lon: -2.3136742752236383 }, // Grove Lane 2
  { lat: 53.38197474984305, lon: -2.301721483122266 }, // WhiteCarr Lane
  { lat: 53.38206256687036, lon: -2.2895990348048074 }, // Newall Road
  { lat: 53.38376069418351, lon: -2.285804327940385 }, // Tuffley Road
  { lat: 53.3848547338893, lon: -2.27645291332257 }, // M56 J4
  { lat: 53.41024950540678, lon: -2.2668377470776044 }, // Princess Parkway
  { lat: 53.462443535970536, lon: -2.243051446578082 }, // Greenheys Lane
  { lat: 53.46399033792069, lon: -2.2381045601744134 }, // Burlington Street
  { lat: 53.4630882923527, lon: -2.2352523880398976 }, // Devas Street（終點）
];

const ROUTE_B1_POINTS = [
  ORIGIN,
  { lat: 53.380997501697195, lon: -2.329407156562963 }, // Grove Lane 1
  { lat: 53.38105712696837, lon: -2.3136742752236383 }, // Grove Lane 2
  { lat: 53.38197474984305, lon: -2.301721483122266 }, // WhiteCarr Lane
  { lat: 53.38206256687036, lon: -2.2895990348048074 }, // Newall Road
  { lat: 53.38376069418351, lon: -2.285804327940385 }, // Tuffley Road
  { lat: 53.3848547338893, lon: -2.27645291332257 }, // M56 J4
  { lat: 53.39862923645316, lon: -2.229245926586292 }, // M60(ACW)
  { lat: 53.456877553343844, lon: -2.1344994287647565 }, // M60 J24
  { lat: 53.45701712817726, lon: -2.1141655283175926 }, // Denton Pharmacy（終點）
];

const ROUTE_B2_POINTS = [
  ORIGIN,
  { lat: 53.391284170352186, lon: -2.341142420931091 }, // A560/Woodlands Parkway
  { lat: 53.40094252096786, lon: -2.2995420642369706 }, // Baguley
  { lat: 53.40094252096786, lon: -2.2995420642369706 }, // M56(E) J2
  { lat: 53.39862923645316, lon: -2.229245926586292 }, // M60(ACW)
  { lat: 53.456877553343844, lon: -2.1344994287647565 }, // M60 J24
  { lat: 53.45701712817726, lon: -2.1141655283175926 }, // Denton Pharmacy（終點）
];

const ROUTES = [
  { id: "A", label: "路線 A · M56 → Devas St.", points: ROUTE_A_POINTS },
  { id: "B1", label: "路線 B1 · M56 → Denton", points: ROUTE_B1_POINTS },
  { id: "B2", label: "路線 B2 · A560 → Denton", points: ROUTE_B2_POINTS },
];

// 用正常行車時間 vs 加咗實時交通嘅時間，計返個「塞車程度」
function classifyCongestion(normalSeconds, trafficSeconds) {
  const ratio = trafficSeconds / normalSeconds;
  if (ratio < 1.15) return { level: "暢通", ratioPct: Math.round((ratio - 1) * 100) };
  if (ratio < 1.4) return { level: "頗塞", ratioPct: Math.round((ratio - 1) * 100) };
  return { level: "大塞車", ratioPct: Math.round((ratio - 1) * 100) };
}

async function fetchRoute(route, apiKey) {
  const coords = route.points.map((p) => `${p.lat},${p.lon}`).join(":");
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${apiKey}&traffic=true&travelMode=car`;

  const res = await fetch(url, { cache: "no-store" });
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

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "未設定 TOMTOM_API_KEY" }, { status: 500 });
  }

  const results = await Promise.all(ROUTES.map((r) => fetchRoute(r, apiKey)));
  return Response.json({ routes: results, updatedAt: new Date().toISOString() });
}