// app/api/man_fuel_find/route.js
// 一次性用嚟搵Costco Manchester同Asda Altrincham嘅node_id
// 攞到之後將個ID抄落man_fuel/route.js,呢個file就可以刪走
//
// 用法：deploy咗之後開瀏覽器 /api/man_fuel_find，等佢行完（可能要一分鐘計,
// 因為要行晒17個batch），會噴返個JSON列出所有postcode開頭係M41或者WA14嘅站
//
// 記得喺 .env.local / Vercel Environment Variables 加：
// FUEL_FINDER_CLIENT_ID=你嘅client id
// FUEL_FINDER_CLIENT_SECRET=你嘅client secret

const BASE = "https://www.fuel-finder.service.gov.uk";

async function getToken() {
  const res = await fetch(`${BASE}/api/v1/oauth/generate_access_token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.FUEL_FINDER_CLIENT_ID,
      client_secret: process.env.FUEL_FINDER_CLIENT_SECRET,
    }),
    cache: "no-store",
  });
  const data = await res.json();
  const payload = data.data || data;
  if (!payload.access_token) throw new Error("冇攞到access_token：" + JSON.stringify(data));
  return payload.access_token;
}

async function fetchAllBatches(path, token) {
  const all = [];
  let batch = 1;
  while (true) {
    const url = `${BASE}${path}?batch-number=${batch}`;
    const res = await fetch(url, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const chunk = await res.json();
    const rows = Array.isArray(chunk) ? chunk : [];
    all.push(...rows);
    if (rows.length < 500) break;
    batch += 1;
    // 保守啲，避免撞rate limit
    await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await getToken();
  const stations = await fetchAllBatches("/api/v1/pfs", token);

  // 淨係搵postcode開頭係M41（Costco Manchester）或者WA14（Asda Altrincham）嘅站
  const matches = stations
    .filter((s) => {
      const pc = s?.location?.postcode || "";
      return pc.startsWith("M41") || pc.startsWith("WA14");
    })
    .map((s) => ({
      node_id: s.node_id,
      trading_name: s.trading_name,
      brand_name: s.brand_name,
      postcode: s?.location?.postcode,
      address_line_1: s?.location?.address_line_1,
    }));

  return Response.json({ totalStationsScanned: stations.length, matches });
}
