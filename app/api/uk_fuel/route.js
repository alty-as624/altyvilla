// app/api/uk_fuel/route.js
export async function GET() {
  const stations = [
    { id: "costco-trafford", label: "COSTCO Manchester", lat: 53.46801, lon: -2.34316, showDiesel: false },
    { id: "costco-haydock", label: "COSTCO Haydock", lat: 53.47463, lon: -2.66282, showDiesel: false },
    { id: "costco-oldham", label: "COSTCO Oldham", lat: 53.52915, lon: -2.15822, showDiesel: false },
    { id: "asda-altrincham", label: "ASDA Altrincham", lat: 53.3976395, lon: -2.3649553, showDiesel: false },
    { id: "asda-trafford", label: "ASDA Trafford", lat: 53.46717, lon: -2.344282, showDiesel: false },
    { id: "morrisons-denton", label: "Morrisons Denton", lat: 53.455848, lon: -2.1126, showDiesel: true },
  ];

  const results = await Promise.all(
    stations.map(async (s) => {
      try {
        const url = `https://fuelcosts.co.uk/api/stations?lat=${s.lat}&lon=${s.lon}&radius=0.05`;
        const res = await fetch(url, {
          headers: { "User-Agent": "AltyVilla/1.0" },
          next: { revalidate: 120 }, // cache 2 分鐘
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const station = data.stations?.[0];
        if (!station) throw new Error("no station");
        const e10 = station.prices?.find((p) => p.fuel_type === "E10");
        const b7 = station.prices?.find((p) => p.fuel_type === "B7_STANDARD");
        return {
          id: s.id,
          label: s.label,
          e10: e10 ? e10.price : null,
          diesel: s.showDiesel && b7 ? b7.price : null,
          error: null,
        };
      } catch (e) {
        return {
          id: s.id,
          label: s.label,
          e10: null,
          diesel: null,
          error: "失敗",
        };
      }
    })
  );

  const validE10 = results.map((s) => s.e10).filter((p) => p != null);
  const cheapest = validE10.length ? Math.min(...validE10) : null;

  return Response.json({
    stations: results,
    cheapest,
    updatedAt: new Date().toISOString(),
  });
}