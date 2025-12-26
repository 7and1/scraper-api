import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0ea5e9, #075985)",
        color: "white",
        fontSize: 64,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "center",
        }}
      >
        <div>Scraper API</div>
        <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.9 }}>
          Web scraping made simple
        </div>
      </div>
    </div>,
    size,
  );
}
