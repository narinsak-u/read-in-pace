import { Link } from "@tanstack/react-router";
import { Pencil, Trash2, RotateCcw, BookOpen } from "lucide-react";
import type { Book } from "@/lib/books";
import { useApp } from "@/lib/app-state";

type Variant = "default" | "borrowed" | "purchased";

export function BookCard({ book, variant = "default" }: { book: Book; variant?: Variant }) {
  const { adminMode, borrow, buy, returnBook } = useApp();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
      {adminMode && (
        <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur ring-1 ring-border hover:bg-background">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive backdrop-blur ring-1 ring-border hover:bg-background">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Link to="/book/$id" params={{ id: book.id }} className="block overflow-hidden bg-muted">
        <div className="aspect-[2/3] w-full overflow-hidden">
          <img
            src={book.cover}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link to="/book/$id" params={{ id: book.id }} className="space-y-1">
          <h3 className="line-clamp-1 font-semibold tracking-tight">{book.title}</h3>
          <p className="text-sm text-muted-foreground">{book.author}</p>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {variant === "borrowed" ? (
            <button
              onClick={() => returnBook(book.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" /> Return Book
            </button>
          ) : variant === "purchased" ? (
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <BookOpen className="h-4 w-4" /> Read Now
            </button>
          ) : (
            <>
              <button
                onClick={() => buy(book.id)}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Buy ${book.price.toFixed(2)}
              </button>
              <button
                onClick={() => borrow(book.id)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Borrow
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
