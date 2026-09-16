"use client";
import { useEffect, useMemo, useState } from "react";

const CSV_URL = "/data/shinkansen-ngy-kyo.csv";
const JR_SHINKANSEN_STATUS =
  "https://traininfo.jr-central.co.jp/shinkansen/pc/ja/index.html";

const TRAIN_STYLE = {
  nozomi: { bg: "#cfe3f7", dep: "#0b5cab" },
  hikari: { bg: "#f3d9c4", dep: "#a34a1a" },
  kodama: { bg: "#dde0d6", dep: "#4a5540" },
};

function trainKind(name) {
  const s = String(name || "");
  if (s.includes("のぞみ")) return "nozomi";
  if (s.includes("ひかり")) return "hikari";
  if (s.includes("こだま")) return "kodama";
  return "kodama";
}

function parseHHMM(s) {
  const [h, m] = String(s).trim().split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").trim();
    });
    return row;
  });
}

function dayParts(dayField) {
  const raw = String(dayField || "")
    .toLowerCase()
    .replace(/\s/g, "");
  if (!raw || raw === "all") return ["weekday", "saturday", "holiday"];
  return raw.split("+").filter(Boolean);
}

/** 同一 dep 同一列；唔同 dep 分列；由早到晚 */
function buildPivot(rows, dir) {
  const map = new Map();
  for (const r of rows) {
    if (r.dir !== dir) continue;
    const depMin = parseHHMM(r.dep);
    if (depMin == null) continue;
    if (!map.has(depMin)) {
      map.set(depMin, {
        depMin,
        weekday: null,
        saturday: null,
        holiday: null,
      });
    }
    const slot = map.get(depMin);
    const cell = {
      dep: r.dep,
      arr: r.arr,
      train: r.train,
      dest: r.dest,
      kind: trainKind(r.train),
    };
    for (const d of dayParts(r.day)) {
      if (d === "weekday" || d === "saturday" || d === "holiday") {
        slot[d] = cell;
      }
    }
  }
  return [...map.values()].sort((a, b) => a.depMin - b.depMin);
}

function Cell({ cell }) {
  if (!cell) {
    return (
      <td
        style={{
          background: "rgba(28,43,42,0.04)",
          border: "1px solid rgba(28,43,42,0.14)",
          padding: "5px 3px",
        }}
      />
    );
  }
  const st = TRAIN_STYLE[cell.kind] || TRAIN_STYLE.kodama;
  return (
    <td
      style={{
        background: st.bg,
        border: "1px solid rgba(28,43,42,0.14)",
        padding: "5px 3px",
        verticalAlign: "middle",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 12,
          color: st.dep,
          lineHeight: 1.2,
        }}
      >
        {cell.dep}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#1c2b2a",
          opacity: 0.75,
          marginTop: 1,
        }}
      >
        → {cell.arr}
      </div>
    </td>
  );
}

function DirTable({ title, pivot }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        background: "#e2d9c5",
        border: "1px solid rgba(28,43,42,0.18)",
        borderRadius: 3,
        padding: "10px 6px 12px",
      }}
    >
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          margin: "0 0 8px",
          textAlign: "center",
        }}
      >
        {title}
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: 11,
        }}
      >
        <thead>
          <tr>
            {["平日", "土曜", "休日"].map((h) => (
              <th
                key={h}
                style={{
                  background: "rgba(28,43,42,0.08)",
                  fontWeight: 700,
                  fontSize: 10.5,
                  border: "1px solid rgba(28,43,42,0.14)",
                  padding: "5px 3px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pivot.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                style={{
                  textAlign: "center",
                  padding: 12,
                  opacity: 0.7,
                  border: "1px solid rgba(28,43,42,0.14)",
                }}
              >
                無班次資料
              </td>
            </tr>
          ) : (
            pivot.map((row) => (
              <tr key={row.depMin}>
                <Cell cell={row.weekday} />
                <Cell cell={row.saturday} />
                <Cell cell={row.holiday} />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ShinkansenTimetable() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(CSV_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("csv");
        return res.text();
      })
      .then((text) => setRows(parseCsv(text)))
      .catch(() => setError(true));
  }, []);

  const ngy = useMemo(() => buildPivot(rows, "ngy_kyo"), [rows]);
  const kyo = useMemo(() => buildPivot(rows, "kyo_ngy"), [rows]);

  return (
    <div>
      <h1 style={{ fontFamily: "serif" }}>新幹線班次</h1>
      <div
        style={{
          fontSize: 12,
          opacity: 0.75,
          marginBottom: 14,
          lineHeight: 1.45,
        }}
      >
        班次表：2026/09/12
        {" · "}
        <a
          href={JR_SHINKANSEN_STATUS}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1c2b2a", fontWeight: 600 }}
        >
          JR運行狀況
        </a>
        {" · "}
        <a href="/nagoya" style={{ color: "#1c2b2a", fontWeight: 600 }}>
          返回名古屋
        </a>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "#991b1b", marginBottom: 12 }}>
          讀唔到班次表，請確認 public/data/shinkansen-ngy-kyo.csv
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <DirTable title="名古屋" pivot={ngy} />
        <DirTable title="京都" pivot={kyo} />
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          opacity: 0.8,
          lineHeight: 1.55,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: "#cfe3f7",
            borderRadius: 2,
            verticalAlign: -2,
            marginRight: 3,
            border: "1px solid rgba(28,43,42,0.15)",
          }}
        />
        快
        {" · "}
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: "#f3d9c4",
            borderRadius: 2,
            verticalAlign: -2,
            marginRight: 3,
            border: "1px solid rgba(28,43,42,0.15)",
          }}
        />
        中
        {" · "}
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: "#dde0d6",
            borderRadius: 2,
            verticalAlign: -2,
            marginRight: 3,
            border: "1px solid rgba(28,43,42,0.15)",
          }}
        />
        慢
        （格底色；開車字色跟車型，到達一律深色細字）
      </div>
    </div>
  );
}
