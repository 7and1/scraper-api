import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-5 text-sm text-gray-100",
        className,
      )}
    >
      <code className="font-mono">{code}</code>
    </pre>
  );
}
