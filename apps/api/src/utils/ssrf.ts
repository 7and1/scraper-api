const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata",
  "kubernetes.default.svc",
  "kubernetes.default",
  "kubernetes",
  "instance-data",
  "169.254.170.2",
  "169.254.0.0",
]);

const BLOCKED_PORTS = new Set([
  22, 23, 25, 53, 110, 143, 445, 3306, 3389, 5432, 5900, 6379, 11211, 27017,
]);

const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^ff00:/i,
];

export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validateUrl(input: string): SSRFValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "URL must be a string" };
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return { valid: false, error: "URL cannot be empty" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: `Protocol "${url.protocol.replace(":", "")}" is not allowed. Use http or https.`,
    };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, error: "Access to this host is not allowed" };
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
  }

  const port = url.port
    ? Number.parseInt(url.port, 10)
    : url.protocol === "https:"
      ? 443
      : 80;

  if (Number.isNaN(port)) {
    return { valid: false, error: "Invalid port" };
  }

  if (BLOCKED_PORTS.has(port)) {
    return { valid: false, error: `Port ${port} is not allowed` };
  }

  if (
    port >= 5000 &&
    port <= 9999 &&
    ![5000, 8000, 8080, 8443, 9000].includes(port)
  ) {
    return { valid: false, error: `Port ${port} is not allowed` };
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => o > 255)) {
      return { valid: false, error: "Invalid IP address" };
    }

    const [a, b] = octets;
    if (a === 10) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 192 && b === 168) {
      return {
        valid: false,
        error: "Access to private IP addresses is not allowed",
      };
    }
    if (a === 127) {
      return {
        valid: false,
        error: "Access to loopback addresses is not allowed",
      };
    }
    if (a === 0) {
      return {
        valid: false,
        error: "Access to reserved addresses is not allowed",
      };
    }
    if (a === 169 && b === 254) {
      return {
        valid: false,
        error: "Access to link-local addresses is not allowed",
      };
    }
  }

  if (url.toString().length > 2048) {
    return {
      valid: false,
      error: "URL exceeds maximum length of 2048 characters",
    };
  }

  return { valid: true, normalizedUrl: url.toString() };
}
