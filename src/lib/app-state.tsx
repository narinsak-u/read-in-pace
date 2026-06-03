import { createContext, useContext, useState, type ReactNode } from "react";

type AppState = {
  signedIn: boolean;
  username: string;
  adminMode: boolean;
  borrowed: string[];
  purchased: string[];
  liked: Record<string, boolean>;
  toggleAuth: () => void;
  toggleAdmin: () => void;
  borrow: (id: string) => void;
  returnBook: (id: string) => void;
  buy: (id: string) => void;
  toggleLike: (id: string) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [borrowed, setBorrowed] = useState<string[]>(["2", "5"]);
  const [purchased, setPurchased] = useState<string[]>(["1", "7", "9"]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const value: AppState = {
    signedIn,
    username: "Alex Rivera",
    adminMode,
    borrowed,
    purchased,
    liked,
    toggleAuth: () => setSignedIn((s) => !s),
    toggleAdmin: () => setAdminMode((a) => !a),
    borrow: (id) => setBorrowed((b) => (b.includes(id) ? b : [...b, id])),
    returnBook: (id) => setBorrowed((b) => b.filter((x) => x !== id)),
    buy: (id) => setPurchased((p) => (p.includes(id) ? p : [...p, id])),
    toggleLike: (id) => setLiked((l) => ({ ...l, [id]: !l[id] })),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
};
