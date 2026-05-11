import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-12">
      <h1 className="text-3xl font-semibold tracking-tight">Aonex</h1>
      <p className="mt-2 text-neutral-600">
        Multi-marketplace product catalog management.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </Link>
        <Link
          href="/connections"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Connections
        </Link>
      </div>
    </main>
  );
}
