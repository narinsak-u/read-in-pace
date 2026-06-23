export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: string;
  cover: string;
  synopsis: string;
  category: string;
  crop: number | null;
  shelf: string;
  year: number;
  trending: boolean;
  inStock: number;
  isAvailable: boolean;
  totalPages: number;
  likeCount: number;
  commentCount: number;
  avgRating: number;
  ratingsCount: number;
}

export type BookCard = Pick<
  Book,
  "id" | "slug" | "title" | "author" | "cover" | "crop" | "avgRating" | "price"
>;

export function mapBookResponse(raw: Record<string, unknown>): Book {
  return {
    id: raw.id as string,
    slug: raw.slug as string,
    title: raw.title as string,
    author: raw.author as string,
    price: String(raw.price ?? "0"),
    cover: raw.cover as string,
    synopsis: raw.synopsis as string,
    category: raw.category as string,
    crop: (raw.crop as number | null) ?? null,
    shelf: raw.shelf as string,
    year: raw.year as number,
    trending: raw.trending as boolean,
    inStock: raw.inStock as number,
    isAvailable: raw.isAvailable as boolean,
    totalPages: raw.totalPages as number,
    likeCount: raw.likeCount as number,
    commentCount: raw.commentCount as number,
    avgRating: Number(raw.avgRating ?? 0),
    ratingsCount: raw.ratingsCount as number,
  };
}
