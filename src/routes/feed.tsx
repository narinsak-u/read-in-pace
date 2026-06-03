import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { books } from "@/lib/books";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Read in Pace" },
      { name: "description", content: "Browse trending books and the full library on Read in Pace." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const [page, setPage] = useState(1);
  const trending = books.filter((b) => b.trending);
  const totalPages = 10;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
                <Flame className="h-3.5 w-3.5" /> Trending Now
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">This week's quiet favorites</h2>
            </div>
            <span className="hidden text-sm text-muted-foreground sm:block">Updated daily</span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {trending.map((b, i) => (
              <article
                key={b.id}
                className={`group relative overflow-hidden rounded-3xl border border-border bg-card transition-all hover:shadow-2xl hover:shadow-black/5 ${
                  i === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <div className={`relative ${i === 0 ? "aspect-[16/10]" : "aspect-[16/11]"} overflow-hidden`}>
                  <img src={b.cover} alt={b.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                      #{i + 1} Trending
                    </span>
                    <h3 className={`mt-3 font-semibold tracking-tight ${i === 0 ? "text-3xl" : "text-xl"}`}>{b.title}</h3>
                    <p className="text-sm text-white/70">{b.author}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">The full shelf</h2>
            <span className="text-sm text-muted-foreground">{books.length} titles</span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>

          <Pagination page={page} setPage={setPage} total={totalPages} />
        </section>
      </main>
    </>
  );
}

function Pagination({ page, setPage, total }: { page: number; setPage: (n: number) => void; total: number }) {
  const pages = [1, 2, 3];
  return (
    <div className="mt-14 flex items-center justify-center gap-1.5">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        disabled={page === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          onClick={() => setPage(n)}
          className={`h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors ${
            page === n ? "bg-foreground text-background" : "hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
      <span className="px-2 text-muted-foreground">…</span>
      <button
        onClick={() => setPage(total)}
        className={`h-9 min-w-9 rounded-full px-3 text-sm font-medium transition-colors ${
          page === total ? "bg-foreground text-background" : "hover:bg-muted"
        }`}
      >
        {total}
      </button>
      <button
        onClick={() => setPage(Math.min(total, page + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted disabled:opacity-40"
        disabled={page === total}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
