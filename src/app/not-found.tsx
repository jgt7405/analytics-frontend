// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-semibold mb-4">Not Found</h2>
      <p className="text-gray-600 mb-6">Could not find the requested page.</p>
      <Link
        href="/basketball/wins"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
