import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, Library } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BookCard } from "@/components/BookCard";
import { books } from "@/lib/books";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "My Dashboard — Read in Pace" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { username, borrowed, purchased } = useApp();
  const [tab, setTab] = useState<"borrowed" | "purchased">("borrowed");

  const borrowedBooks = books.filter((b) => borrowed.includes(b.id));
  const purchasedBooks = books.filter((b) => purchased.includes(b.id));
  const list = tab === "borrowed" ? borrowedBooks : purchasedBooks;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{username}</h1>
        </div>

        <div className="mb-8 inline-flex gap-1 rounded-full border border-border bg-card p-1">
          <TabButton active={tab === "borrowed"} onClick={() => setTab("borrowed")} icon={<BookMarked className="h-4 w-4" />}>
            Borrowed · {borrowedBooks.length}
          </TabButton>
          <TabButton active={tab === "purchased"} onClick={() => setTab("purchased")} icon={<Library className="h-4 w-4" />}>
            Purchased · {purchasedBooks.length}
          </TabButton>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <p className="text-muted-foreground">Nothing here yet.</p>
            <Link to="/feed" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Find something to read →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {list.map((b) => (
              <BookCard key={b.id} book={b} variant={tab} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
        active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
