import type { Item } from '../types';
import { Sublist } from './Sublist';

type PlaylistProps = {
  list: Item[];
};

export function Playlist({ list }: PlaylistProps) {
  return (
    <div>
      <Sublist title="A-List" score={47} list={list} />
      <Sublist title="B-List" score={28} list={list} />
      <Sublist title="C-List" score={23} list={list} />
    </div>
  );
}
