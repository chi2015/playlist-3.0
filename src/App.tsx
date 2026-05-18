import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Modal } from './components/Modal';
import { Playlist } from './components/Playlist';
import { Song } from './components/Song';
import { remote } from './api';
import { decorateList, nextDate, prevDate, today, unixOf, yearOf } from './utils';
import { downloadPDF } from './pdf';
import type { Item, Mode } from './types';

const currentYear = dayjs().year() - 1;

const yearsArray: number[] = (() => {
  const arr: number[] = [];
  for (let y = currentYear + 1; y >= 2007; y--) arr.push(y);
  return arr;
})();

const isMobileNow = () => window.innerWidth < 800;

export function App() {
  // --- core data ---------------------------------------------------------
  const [actualDate, setActualDate] = useState<string>(today);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [top100year, setTop100Year] = useState<number>(currentYear);

  const [storage, setStorage] = useState<Record<string, Item[]>>({});
  const [top100Storage, setTop100Storage] = useState<Record<number, Item[]>>({});
  const [top10Storage, setTop10Storage] = useState<Record<number, Item[]>>({});

  // --- ui state ----------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('main');
  const [isMobile, setIsMobile] = useState<boolean>(isMobileNow);
  const [showLeftMenu, setShowLeftMenu] = useState<boolean>(() => !isMobileNow());
  const [errorTxt, setErrorTxt] = useState<string | false>(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragover, setDragover] = useState(false);

  // --- countdown ---------------------------------------------------------
  const [countdownMode, setCountdownMode] = useState(false);
  const [countdownNum, setCountdownNum] = useState(100);

  // --- refs --------------------------------------------------------------
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mirror storage into refs so effects can read latest values without
  // declaring storage as a dependency (which would refire fetches).
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const top100StorageRef = useRef(top100Storage);
  top100StorageRef.current = top100Storage;
  const top10StorageRef = useRef(top10Storage);
  top10StorageRef.current = top10Storage;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const top100yearRef = useRef(top100year);
  top100yearRef.current = top100year;

  // --- helpers -----------------------------------------------------------
  const addToStorage = useCallback((date: string, list: Item[]) => {
    setStorage((prev) => ({ ...prev, [date]: decorateList(list, date, prev) }));
  }, []);

  const setPlaylistData = useCallback(
    (data: { date?: string; list?: unknown; error?: string }) => {
      if (data.date) setActualDate(data.date.substring(0, 10));
      if (data.date && data.list) addToStorage(data.date.substring(0, 10), data.list as Item[]);
      if (data.error) setErrorTxt(data.error);
    },
    [addToStorage],
  );

  // Watcher equivalent: when actualDate changes, fetch if not cached.
  useEffect(() => {
    if (storageRef.current[actualDate]) return;
    let cancelled = false;
    setLoading(true);
    remote('current', { current_date: actualDate })
      .then((data) => {
        if (cancelled) return;
        if (data.date) setActualDate(data.date.substring(0, 10));
        if (data.date && data.list) addToStorage(data.date.substring(0, 10), data.list as Item[]);
        setCurrentDate((prev) => prev ?? (data.date ? data.date.substring(0, 10) : actualDate));
        if (data.error) setErrorTxt(data.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actualDate, addToStorage]);

  // Top100 / top10 fetch on mode or year change.
  const checkTopStorage = useCallback(() => {
    const m = modeRef.current;
    if (m !== 'top100' && m !== 'top10artists') return;
    const ref = m === 'top100' ? top100StorageRef : top10StorageRef;
    const setter = m === 'top100' ? setTop100Storage : setTop10Storage;
    const year = top100yearRef.current;
    if (ref.current[year]) return;
    setLoading(true);
    remote(m, { year })
      .then((data) => {
        if (data.year) setTop100Year(data.year);
        if (data.list) {
          const targetYear = data.year ?? year;
          setter((prev) => ({ ...prev, [targetYear]: data.list as Item[] }));
        }
        if (data.error) {
          if (year > yearsArray[0]) setTop100Year(year - 1);
          if (year < yearsArray[yearsArray.length - 1]) setTop100Year(year + 1);
          setErrorTxt(data.error);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    checkTopStorage();
    setCountdownMode(top100year > currentYear);
    setCountdownNum(100);
  }, [top100year, checkTopStorage]);

  useEffect(() => {
    if (mode !== 'main') checkTopStorage();
    setCountdownMode(mode === 'top100' && top100yearRef.current >= currentYear);
    setCountdownNum(100);
  }, [mode, checkTopStorage]);

  // --- navigation methods -----------------------------------------------
  const current = useCallback(() => {
    setShowLeftMenu(!isMobile);
    setMode('main');
    if (currentDate && storageRef.current[currentDate]) {
      setActualDate(currentDate);
      return;
    }
    setLoading(true);
    remote('current', {})
      .then((data) => {
        setPlaylistData(data);
        if (data.date) setCurrentDate(data.date.substring(0, 10));
      })
      .finally(() => setLoading(false));
  }, [currentDate, isMobile, setPlaylistData]);

  const latest = useCallback(() => {
    setShowLeftMenu(!isMobile);
    setMode('main');
    if (latestDate && storageRef.current[latestDate]) {
      setActualDate(latestDate);
      return;
    }
    setLoading(true);
    remote('latest', {})
      .then((data) => {
        setPlaylistData(data);
        if (data.date) setLatestDate(data.date.substring(0, 10));
      })
      .finally(() => setLoading(false));
  }, [latestDate, isMobile, setPlaylistData]);

  const nextprev = useCallback(
    (isNext: boolean) => {
      const m = modeRef.current;
      if (m === 'main') {
        const target = isNext ? nextDate(actualDate) : prevDate(actualDate);
        if (storageRef.current[target]) {
          setActualDate(target);
          return;
        }
        setLoading(true);
        remote(isNext ? 'next' : 'prev', { pl_date: actualDate })
          .then(setPlaylistData)
          .finally(() => setLoading(false));
      } else {
        const minYear = yearsArray[yearsArray.length - 1];
        const maxYear = yearsArray[0];
        setTop100Year((y) => Math.min(maxYear, Math.max(minYear, isNext ? y + 1 : y - 1)));
      }
    },
    [actualDate, setPlaylistData],
  );

  // Keep latest move() in a ref so the touch-event effect can call it
  // without re-attaching listeners on every render.
  const moveRef = useRef<(dir: 'left' | 'right') => void>(() => {});

  const move = useCallback(
    (direction: 'left' | 'right') => {
      setShowLeftMenu((prev) => prev && !isMobile);
      const el = contentRef.current;
      if (!el) return;
      const cls = 'move' + direction;
      el.classList.add(cls);
      setTimeout(() => {
        el.classList.remove(cls);
        nextprev(direction === 'right');
      }, 300);
    },
    [isMobile, nextprev],
  );

  moveRef.current = move;

  // --- file upload / delete ---------------------------------------------
  const updateData = useCallback((date: string) => {
    setLatestDate((prev) =>
      prev != null && unixOf(date) > unixOf(prev) ? date : prev,
    );
    setCurrentDate((prev) =>
      prev != null && unixOf(date) <= dayjs().unix() ? date : prev,
    );
    const y = Number(yearOf(date));
    setTop100Storage((prev) => {
      if (!(y in prev)) return prev;
      const next = { ...prev };
      delete next[y];
      return next;
    });
    setTop10Storage((prev) => {
      if (!(y in prev)) return prev;
      const next = { ...prev };
      delete next[y];
      return next;
    });
  }, []);

  const uploadFile = useCallback(
    (file: File) => {
      if (file.size > 5120) {
        setErrorTxt('Playlist file size cannot be more than 5KB');
        return;
      }
      const reader = new FileReader();
      setLoading(true);
      reader.readAsText(file, 'UTF-8');
      reader.onload = (event) => {
        const result = String(event.target?.result ?? '');
        remote('upload', { data: result })
          .then((data) => {
            setLoading(false);
            if (data.ok && data.pl_date) {
              updateData(data.pl_date);
              setActualDate(data.pl_date.substring(0, 10));
            } else if (data.error) {
              setErrorTxt(data.error);
            } else {
              setErrorTxt('Error uploading playlist');
            }
          });
      };
    },
    [updateData],
  );

  const uploadFileRef = useRef(uploadFile);
  uploadFileRef.current = uploadFile;

  const openfile = useCallback(() => {
    setShowLeftMenu((prev) => prev && !isMobile);
    fileInputRef.current?.click();
  }, [isMobile]);

  const changefile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleDownloadPDF = useCallback(() => {
    setShowLeftMenu((prev) => prev && !isMobile);
    const list = storage[actualDate];
    if (list) downloadPDF(actualDate, list);
  }, [actualDate, isMobile, storage]);

  const deletePlaylist = useCallback((plDate: string, password: string) => {
    setLoading(true);
    remote('delete', { pl_date: plDate, password })
      .then((data) => {
        if (data.ok) {
          setStorage((prev) => {
            if (!(plDate in prev)) return prev;
            const next = { ...prev };
            delete next[plDate];
            return next;
          });
          const y = Number(yearOf(plDate));
          setTop100Storage((prev) => {
            if (!(y in prev)) return prev;
            const next = { ...prev };
            delete next[y];
            return next;
          });
          setTop10Storage((prev) => {
            if (!(y in prev)) return prev;
            const next = { ...prev };
            delete next[y];
            return next;
          });
          latest();
        } else if (data.error) {
          setErrorTxt(data.error);
        } else {
          setErrorTxt('Error deleting playlist');
        }
      })
      .finally(() => setLoading(false));
  }, [latest]);

  // --- side effects: resize, drag/drop, touch ----------------------------
  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileNow());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag-and-drop on body (port of initDragAndDropEvents).
  useEffect(() => {
    const body = document.body;
    const events = ['dragenter', 'dragover', 'dragleave', 'drop'] as const;
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const highlight = () => {
      body.classList.add('pl-dragover-new');
      setDragover(true);
    };
    const unhighlight = () => {
      body.classList.remove('pl-dragover-new');
      setDragover(false);
    };
    const handleDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) uploadFileRef.current(file);
    };

    events.forEach((ev) => body.addEventListener(ev, preventDefaults));
    (['dragenter', 'dragover'] as const).forEach((ev) =>
      body.addEventListener(ev, highlight),
    );
    (['dragleave', 'drop'] as const).forEach((ev) =>
      body.addEventListener(ev, unhighlight),
    );
    body.addEventListener('drop', handleDrop);

    return () => {
      events.forEach((ev) => body.removeEventListener(ev, preventDefaults));
      (['dragenter', 'dragover'] as const).forEach((ev) =>
        body.removeEventListener(ev, highlight),
      );
      (['dragleave', 'drop'] as const).forEach((ev) =>
        body.removeEventListener(ev, unhighlight),
      );
      body.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Touch swipe on the playlist content (port of initTouchEvents).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let xDown: number | null = null;
    let yDown: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      xDown = e.touches[0].clientX;
      yDown = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (xDown == null || yDown == null) return;
      const xUp = e.touches[0].clientX;
      const yUp = e.touches[0].clientY;
      const xDiff = xDown - xUp;
      const yDiff = yDown - yUp;
      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        moveRef.current(xDiff > 0 ? 'right' : 'left');
      }
      xDown = null;
      yDown = null;
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // --- derived values for render ----------------------------------------
  const mainList = storage[actualDate];
  const yearList =
    mode === 'top100'
      ? top100Storage[top100year]
      : mode === 'top10artists'
        ? top10Storage[top100year]
        : undefined;

  return (
    <div className="main-block" id="playlist-app">
      <div className="header-title">Playlist</div>
      <div className="header">
        <div
          className="main-menu menu-item"
          onClick={() => setShowLeftMenu((s) => !s)}
        />
        {showLeftMenu && (
          <div className="left-menu">
            <div className="lm-item menu-item" onClick={latest}>Latest</div>
            <div className="lm-item menu-item" onClick={current}>Current</div>
            <div className="lm-item menu-item" onClick={openfile}>Add</div>
            <div className="lm-item menu-item" onClick={handleDownloadPDF}>Download</div>
            <div
              className="lm-item menu-item"
              onClick={() => {
                setShowLeftMenu(!isMobile);
                setMode('top100');
              }}
            >
              Top 100
            </div>
            <div
              className="lm-item menu-item"
              onClick={() => {
                setShowLeftMenu(!isMobile);
                setMode('top10artists');
              }}
            >
              Top 10 Artists
            </div>
            <div
              className="lm-item menu-item delete-menu-item"
              onClick={() => {
                setShowLeftMenu(!isMobile);
                setConfirmDelete(true);
              }}
            >
              Delete
            </div>
          </div>
        )}
        <div className="date-block">
          <div className="pl-prev menu-item" onClick={() => move('left')} />
          {mode === 'main' && (
            <input
              type="date"
              id="calendar-date"
              className="pl_date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
            />
          )}
          {(mode === 'top100' || mode === 'top10artists') && (
            // TODO: replace native <select> with a vue-select-equivalent
            // (e.g. react-select) if you need the exact original look.
            <select
              id="pl_year"
              value={top100year}
              onChange={(e) => setTop100Year(Number(e.target.value))}
            >
              {yearsArray.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          <div className="pl-next menu-item" onClick={() => move('right')} />
        </div>
        <div className="updown-items">
          <div className="pl-upload menu-item" title="Add playlist" onClick={openfile} />
          <div className="pl-download menu-item" title="Download PDF" onClick={handleDownloadPDF} />
        </div>
      </div>

      <div
        ref={contentRef}
        id="playlist-content"
        className={loading ? 'list pl-loading' : 'list'}
      >
        {dragover && <div className="pl-dragover" />}
        {countdownMode && (
          <div className="countdown-block">
            {countdownNum > 0 && (
              <button onClick={() => setCountdownNum((n) => n - 1)}>
                Show number {countdownNum}
              </button>
            )}
          </div>
        )}

        {!loading && mode === 'main' && mainList && mainList.length > 0 && (
          <Playlist list={mainList} />
        )}

        {!loading && mode === 'top100' && yearList && yearList.length > 0 &&
          yearList.map((item, index) => (
            <Song
              key={item.id ?? index}
              item={item}
              num={index}
              mode={mode}
              countdownMode={countdownMode}
              countdownNum={countdownNum}
            />
          ))}

        {!loading && mode === 'top10artists' && yearList && yearList.length > 0 &&
          yearList.map((item, index) => (
            <Song key={item.id ?? index} item={item} num={index} mode={mode} />
          ))}
      </div>

      <input
        type="file"
        id="pl_file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={changefile}
      />

      <Modal
        show={!!confirmDelete || !!errorTxt}
        confirmDelete={confirmDelete}
        errorTxt={errorTxt}
        actualDate={actualDate}
        onClose={() => {
          setConfirmDelete(false);
          setErrorTxt(false);
        }}
        onDelete={deletePlaylist}
      />
    </div>
  );
}
