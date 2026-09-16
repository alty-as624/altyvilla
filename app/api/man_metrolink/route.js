// app/api/man_metrolink/route.js
// Metrolink 月台顯示屏 data source：bustimes.org（同 man_bus 用緊嗰個一樣）
// 冇key、唔使login，公開JSON endpoint

const STOPS = [
  {
    id: "altrincham",
    label: "Altrincham",
    subtitle: "→ St. Peter's Square",
    atco: "9400ZZMAALT1",
  },
  {
    id: "deansgate",
    label: "Deansgate",
    subtitle: "→ Altrincham",
    // Deansgate-Castlefield「離開市中心」方向嗰個platform，Green/Purple Line
    atco: "9400ZZMAGMX3",
    // 夜晚Altrincham線收咗車之後，剩返嘅短途班次會截短去Trafford Bar，
    // 呢啲對「去Altrincham」冇用，要filter走
    requireDestination: "Altrincham",
  },
];

const ALLOWED_LINES = ["Green Line", "Purple Line"];
const MAX_RESULTS = 5;
const MAX_WAIT_MINUTES = 90; // 超過呢個就當「而家冇車」，唔好撈埋聽朝頭班車

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

// bustimes 個 destination.name 成日連埋成個站名一齊返，例如
// "Sportcity Etihad Campus (Manchester Metrolink) (To Ashton)"，
// 淨係要個站名本身
function cleanDestinationName(name) {
  if (!name) return "";
  return name
    .replace(/\s*\(Manchester Metrolink\)/i, "")
    .replace(/\s*\((To|From)[^)]*\)/i, "")
    .trim();
}

async function fetchStop(stop) {
  const now = new Date();
  let filtered = [];

  for (const limit of [20, 40, 80]) {
    const times = await fetchTimes(stop.atco, limit);
    filtered = times
      .filter((t) => ALLOWED_LINES.includes(t.service?.line_name))
      // Deansgate 出面班次要真係去到 Altrincham，唔要截短去 Trafford Bar 嗰啲
      .filter(
        (t) => !stop.requireDestination || cleanDestinationName(t.destination?.name) === stop.requireDestination
      )
      .sort((a, b) => new Date(pickTime(a)) - new Date(pickTime(b)));
    if (filtered.length >= MAX_RESULTS) break;
  }

  const trams = filtered
    .map((t) => {
      const effectiveTime = new Date(pickTime(t));
      const waitMinutes = Math.round((effectiveTime - now) / 60000);
      return {
        line: t.service.line_name,
        destination: cleanDestinationName(t.destination?.name),
        waitMinutes,
      };
    })
    .filter((t) => t.waitMinutes >= 0 && t.waitMinutes <= MAX_WAIT_MINUTES)
    .slice(0, MAX_RESULTS);

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
