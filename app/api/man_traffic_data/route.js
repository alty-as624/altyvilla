import { NextResponse } from "next/server";

// 固定次序：返工 J4→J3→Denton，返屋企 M67→Bredbury→M60 J4
const POINTS = [
  { id: "m56-j4-nb", label: "M56 J4 NB", lat: 53.38538371637564, lon: -2.276041221498508 },
  { id: "m56-j3-nb", label: "M56 J3 NB", lat: 53.399619058282425, lon: -2.2706955215568314 },
  { id: "denton-island", label: "Denton Island", lat: 53.45696302022353, lon: -2.137167687301715 },
  { id: "m67", label: "M67", lat: 53.45645957387766, lon: -2.1332878937498623 },
  { id: "m60-cw-bredbury", label: "M60 CW Bredbury", lat: 53.425999847834376, lon: -2.1244186922211803 },
  { id: "m60-j4", label: "M60 J4", lat: 53.3988411950676, lon: -2.2250579471370515 },
];

const ZOOM = 12;

function statusFrom(flow) {
  if (!flow) return { status: "—", color: "#999" };
  if (flow.roadClosure) return { status: "封", color: "#c96a54" };
  const cur = flow.currentSpeed;
  const free = flow.freeFlowSpeed || 1;
  const ratio = cur / free;
  if (ratio >= 0.85) return { status: "暢通", color: "#7fb8a4" };
  if (ratio >= 0.55) return { status: "慢", color: "#c4a35a" };
  return { status: "塞", color: "#c96a54" };
}

async function fetchPoint(point, key) {
  const url =
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/${ZOOM}/json` +
    `?key=${key}&point=${point.lat},${point.lon}&unit=mph`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const flow = data.flowSegmentData;
    const { status, color } = statusFrom(flow);
    return {
      id: point.id,
      label: point.label,
      currentSpeed: flow?.currentSpeed ?? null,
      freeFlowSpeed: flow?.freeFlowSpeed ?? null,
      roadClosure: !!flow?.roadClosure,
      status,
      color,
      error: null,
    };
  } catch (e) {
    return {
      id: point.id,
      label: point.label,
      currentSpeed: null,
      freeFlowSpeed: null,
      roadClosure: false,
      status: "—",
      color: "#999",
      error: String(e.message || e),
    };
  }
}

export async function GET() {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing TOMTOM_API_KEY" }, { status: 500 });
  }

  const points = await Promise.all(POINTS.map((p) => fetchPoint(p, key)));

  return NextResponse.json({
    points, // 次序固定，唔好 sort
    updatedAt: new Date().toISOString(),
  });
}