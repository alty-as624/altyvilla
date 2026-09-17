// app/api/man_fuel_find/route.js

const BASE = "https://www.fuel-finder.service.gov.uk";

async function getToken() {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID;
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET;

  // 先檢查環境變數
  if (!clientId || !clientSecret) {
    throw new Error(
      `環境變數缺失 → CLIENT_ID: ${!!clientId}, CLIENT_SECRET: ${!!clientSecret}`
    );
  }

  const res = await fetch(`${BASE}/api/v1/oauth/generate_access_token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  const text = await res.text(); // 先攞文字，避免 json 失敗
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Token API 回傳唔係 JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  const payload = data.data || data;

  if (!res.ok || !payload?.access_token) {
    throw new Error(
      `Token 失敗 (${res.status}): ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  return payload.access_token;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getToken();

    // 暫時只測試 token 成功就返
    return Response.json({
      success: true,
      message: "Token 攞到成功！",
      tokenPreview: token.slice(0, 20) + "...",
    });

    // 之後確認 token 正常，先打開下面拉 station 嘅 code
  } catch (err) {
    console.error(err);
    return Response.json(
      {
        error: err.message,
        stack: err.stack?.split("\n").slice(0, 5),
      },
      { status: 500 }
    );
  }
}