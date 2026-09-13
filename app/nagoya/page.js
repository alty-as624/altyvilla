{/* 放喺線況 list 後面、同一個地下鉄 card 內 */}
<div
  style={{
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(28,43,42,0.12)",
  }}
>
  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
    常用站
  </div>
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    {QUICK_STATIONS.map((s) => (
      <a
        key={s.name}
        href={STATION_BASE + encodeURIComponent(s.name)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
          color: "inherit",
          fontSize: 13.5,
          // 窄屏約兩粒一行
          width: "calc(50% - 4px)",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontWeight: 600 }}>{s.name}</span>
        <span style={{ display: "flex", gap: 3 }}>
          {s.lines.map((code) => (
            <LineMark key={code} code={code} />
          ))}
        </span>
      </a>
    ))}
  </div>
</div>