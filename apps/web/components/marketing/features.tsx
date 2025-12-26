import { Shield, Zap, Globe, Camera, Code2, Sparkles } from "lucide-react";

const features = [
  {
    title: "Secure by Default",
    description:
      "SSRF protection, hashed API keys, and audit logs help keep you safe.",
    icon: Shield,
  },
  {
    title: "JavaScript Rendering",
    description:
      "Heavy mode uses browser rendering for SPAs and dynamic sites.",
    icon: Sparkles,
  },
  {
    title: "Screenshots",
    description: "Capture viewport or full-page screenshots in PNG/JPEG/WEBP.",
    icon: Camera,
  },
  {
    title: "Edge Performance",
    description: "Low-latency scraping powered by Cloudflare’s global network.",
    icon: Globe,
  },
  {
    title: "Developer Friendly",
    description: "Clean REST API with request IDs and structured errors.",
    icon: Code2,
  },
  {
    title: "Fast to Integrate",
    description: "One endpoint, sensible defaults, and quick examples.",
    icon: Zap,
  },
];

export function Features() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
            Everything you need to ship
          </h2>
          <p className="mt-3 text-gray-600">
            Use light mode for speed and heavy mode for complex sites. Built-in
            quotas, rate limiting, and logging.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
