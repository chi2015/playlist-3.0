import dayjs from 'dayjs';
import type { Item } from './types';

export const prevDate = (date: string): string =>
  dayjs(date).subtract(7, 'day').format('YYYY-MM-DD');

export const nextDate = (date: string): string =>
  dayjs(date).add(7, 'day').format('YYYY-MM-DD');

export const yearOf = (date: string): string => dayjs(date).format('YYYY');

export const unixOf = (date: string): number => dayjs(date).unix();

export const today = (): string => dayjs().format('YYYY-MM-DD');

export function htmlDecode(input: string): string {
  const e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? '' : (e.childNodes[0].nodeValue ?? '');
}

// Mirrors playlist.js itemInfoClass + setStorage, but pure (no mutation).
export function decorateList(
  list: Item[],
  forDate: string,
  storage: Record<string, Item[]>,
): Item[] {
  const prevList = storage[prevDate(forDate)];
  return list.map((item) => {
    let cls: string | false = false;
    if (item.date_appear === forDate) {
      cls = 'pl-new';
    } else if (prevList) {
      const prev = prevList.find((p) => p.id === item.id);
      if (prev) {
        if (+item.score > +prev.score) cls = 'pl-up';
        else if (+item.score < +prev.score) cls = 'pl-down';
      }
    }
    return { ...item, item_class: cls };
  });
}
