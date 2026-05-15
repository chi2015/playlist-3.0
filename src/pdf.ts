import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

const fonts = (pdfFonts as { pdfMake?: { vfs?: unknown }; vfs?: unknown }) ?? {};
(pdfMake as { vfs?: unknown }).vfs = fonts.pdfMake?.vfs ?? fonts.vfs;

import { htmlDecode } from './utils';
import type { Item } from './types';

export function downloadPDF(actualDate: string, list: Item[]): void {
  const buckets: Record<number, Array<{ text: string; fontSize: number }>> = {
    47: [],
    28: [],
    23: [],
  };

  list.forEach((plItem) => {
    if (buckets[plItem.score]) {
      buckets[plItem.score].push({
        text: `${htmlDecode(plItem.artist)} - ${htmlDecode(plItem.title)}`,
        fontSize: 16,
      });
    }
  });

  const docDefinition = {
    header: `Playlist Date: ${actualDate}`,
    content: [
      { text: 'A-List', fontSize: 13, bold: true, style: 'header', marginTop: 10 },
      ...buckets[47],
      { text: 'B-List', fontSize: 13, bold: true, style: 'header', marginTop: 30 },
      ...buckets[28],
      { text: 'C-List', fontSize: 13, bold: true, style: 'header', marginTop: 30 },
      ...buckets[23],
    ],
  };

  (pdfMake as { createPdf: (def: unknown) => { open: () => void } })
    .createPdf(docDefinition)
    .open();
}
