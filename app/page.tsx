import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Monsta Motion Studio
        </span>
        <Link
          href="/studio"
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors"
        >
          Open Studio
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 text-center py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950 border border-violet-700 text-violet-300 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Powered by fal.ai
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Bring your images{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            to life
          </span>
        </h1>

        <p className="text-lg text-white/60 max-w-2xl mb-10">
          Upload any image, write a motion prompt, and generate a stunning short
          video in seconds. Cinematic, realistic, cartoon — you choose the style.
        </p>

        <Link
          href="/studio"
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-lg transition-all shadow-lg shadow-violet-900/50 glow-pulse"
        >
          Start Creating →
        </Link>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 max-w-4xl w-full text-left">
          {[
            {
              icon: "🎬",
              title: "Multiple Styles",
              desc: "Realistic, cinematic, cartoon, product ad, or mascot animation.",
            },
            {
              icon: "⚡",
              title: "Fast Generation",
              desc: "5 or 10 second clips generated in under a minute.",
            },
            {
              icon: "📥",
              title: "Instant Download",
              desc: "Preview in-browser and download your MP4 directly.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 text-white/30 text-sm border-t border-white/10">
        Monsta Motion Studio — built with fal.ai
      </footer>
    </main>
  );
}
