export type Mode = 'main' | 'top100' | 'top10artists';

export type Item = {
  id: string | number;
  title: string;
  artist: string;
  score: number;
  date_appear?: string;
  item_class?: string | false;
  total?: number;
  artist_total?: number;
  songs?: number;
};
