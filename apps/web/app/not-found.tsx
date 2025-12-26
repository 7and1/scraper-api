import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        The page you are looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Go home
      </Link>
    </div>
  );
}
