import { AlertTriangle } from "lucide-react";

export function ErrorMessage({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
}
