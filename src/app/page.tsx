import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen border-x border-border max-w-5xl mx-auto flex flex-col justify-center px-8 md:px-20 py-24">
      <div className="flex border-b border-border pb-12 mb-12">
        <h1 className="font-serif text-5xl md:text-8xl font-medium tracking-tight text-foreground leading-[1.1]">
          Orchestrate <br/>
          <span className="italic text-primary lg:ml-24">your inventory.</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="max-w-md">
          <p className="font-sans text-lg md:text-xl font-light text-muted-foreground leading-relaxed">
            Aonex introduces a highly refined approach to multi-marketplace product catalog management. 
            Synchronize your data with absolute precision and uncompromising style.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 md:justify-end font-sans">
          <Link
            href="/signup"
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden border border-primary bg-primary px-8 font-medium text-primary-foreground transition-all duration-300 hover:bg-transparent hover:text-primary"
          >
            <span className="mr-2">Get started</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </Link>

          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center border border-border bg-transparent px-8 font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Sign in
          </Link>
        </div>
      </div>
      
      <div className="mt-24 pt-8 border-t border-border flex justify-between text-sm text-muted-foreground font-sans tracking-wide uppercase">
        <span>© {new Date().getFullYear()} Aonex</span>
        <span>Premium Commerce</span>
      </div>
    </main>
  );
}
