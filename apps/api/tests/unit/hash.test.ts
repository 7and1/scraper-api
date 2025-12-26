import { describe, expect, it } from "vitest";
import { generateApiKey, getKeyPrefix, hashApiKey } from "../../src/utils/hash";

describe("hash utils", () => {
  it("generates API keys in expected format", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^sk_[0-9a-f]{64}$/);
    expect(key).toHaveLength(67);
    expect(getKeyPrefix(key)).toHaveLength(11);
  });

  it("hashes API keys consistently", async () => {
    const key =
      "sk_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const hash = await hashApiKey(key);
    expect(hash).toBe(
      "c72f6d852a280f0e610550870afae5cb0619f1efe6dbfe9b0ef671aa5488f3c3",
    );
  });
});
