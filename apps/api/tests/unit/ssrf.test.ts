import { describe, expect, it } from "vitest";
import { validateUrl } from "../../src/utils/ssrf";

describe("SSRF protection", () => {
  it("allows valid HTTP URLs", () => {
    const result = validateUrl("https://example.com");
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe("https://example.com/");
  });

  it("blocks localhost", () => {
    const result = validateUrl("http://localhost:3000");
    expect(result.valid).toBe(false);
  });

  it("blocks 127.0.0.1", () => {
    const result = validateUrl("http://127.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("blocks private IP 10.x.x.x", () => {
    const result = validateUrl("http://10.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("blocks AWS metadata", () => {
    const result = validateUrl("http://169.254.169.254/latest/meta-data/");
    expect(result.valid).toBe(false);
  });

  it("blocks file protocol", () => {
    const result = validateUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
  });

  it("blocks dangerous ports", () => {
    const result = validateUrl("http://example.com:22");
    expect(result.valid).toBe(false);
  });
});
