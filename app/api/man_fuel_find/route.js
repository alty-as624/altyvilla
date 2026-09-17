// app/api/man_fuel_find/route.js

const BASE = "https://www.fuel-finder.service.gov.uk";

async function getToken() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(`環境變數缺失 → ID: ${!!clientId}, SECRET: ${!!clientSecret}`);
  }

  // 改用官方推薦的 form-urlencoded 方式
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "fuelfinder.read",
  });

  const res = await fetch(`${BASE}/api/v1/oauth/generate_access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "altyvilla-fuel-checker/1.0",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Token API 回傳唔係 JSON (${res.status}): ${text.slice(0, 400)}`);
  }

  // 兼容兩種 response 結構
  const token = data.access_token || data.data?.access_token;

  if (!res.ok || !token) {
    throw new Error(`Token 失敗 (${res.status}): ${JSON.stringify(data).slice(0, 500)}`);
  }

  return token;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getToken();

    return Response.json({
      success: true,
      message: "Token 成功！",
      tokenPreview: token.slice(0, 30) + "...",
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}