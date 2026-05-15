import type { Item } from '../types';
import { Song } from './Song';

type SublistProps = {
  title: string;
  score: number;
  list: Item[];
};

export function Sublist({ title, score, list }: SublistProps) {
  return (
    <div>
      <div className="list-title">{title}</div>
      {list
        .filter((item) => item.score === score)
        .map((item) => (
          <Song key={item.id} item={item} mode="main" />
        ))}
    </div>
  );
}
