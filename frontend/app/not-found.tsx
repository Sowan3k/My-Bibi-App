import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl mb-4 animate-float">🥀</p>
      <h1 className="font-display text-4xl font-semibold text-foreground mb-2">
        This page wandered off
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Whatever you were looking for isn't here — but everything you two have
        kept is safe where you left it.
      </p>
      <Link href="/us" className="btn-primary">
        Back to your space ❤️
      </Link>
    </main>
  );
}
