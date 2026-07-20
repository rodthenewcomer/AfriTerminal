import type { Metadata } from "next";
import { latestNews } from "@/lib/news";
import { NewsDesk } from "@/components/news/news-desk";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Actualités directement rattachées aux sociétés cotées à la BRVM, avec liens vers les articles originaux.",
};

export default function NewsPage() {
  const news = latestNews(120);
  return <NewsDesk news={news} />;
}
