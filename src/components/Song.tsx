import type { Item, Mode } from '../types';

type SongProps = {
  item: Item;
  mode: Mode;
  num?: number;
  countdownMode?: boolean;
  countdownNum?: number;
};

export function Song({ item, mode, num = 0, countdownMode, countdownNum }: SongProps) {
  // Mirrors Vue: <div class="list-item" v-if="!countdown_mode || countdown_num < num + 1">
  if (countdownMode && countdownNum != null && countdownNum >= num + 1) return null;

  const leftInfoClass =
    mode === 'main'
      ? `item-info ${item.item_class ? item.item_class : ''}`.trim()
      : 'item-info top100';

  return (
    <div className="list-item">
      {mode === 'main' ? (
        <div className={leftInfoClass} />
      ) : (
        <div className={leftInfoClass}>{num + 1}</div>
      )}

      <div className={`item-main ${mode === 'main' ? 'item-mr' : ''}`.trim()}>
        <div className="song" dangerouslySetInnerHTML={{ __html: item.title }} />
        <div className="artist" dangerouslySetInnerHTML={{ __html: item.artist }} />
      </div>

      {mode === 'top100' && <div className="item-info total">{item.total}</div>}
      {mode === 'top10artists' && (
        <>
          <div className="item-info total">{item.artist_total}</div>
          <div className="item-info top100">{item.songs}</div>
        </>
      )}
    </div>
  );
}
