import { PlaygroundForm } from "@/components/playground/form";

export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Playground</h1>
        <p className="mt-1 text-sm text-gray-600">
          Test <span className="font-mono">/api/v1/scrape</span> and{" "}
          <span className="font-mono">/api/v1/screenshot</span>.
        </p>
      </div>
      <PlaygroundForm />
    </div>
  );
}
