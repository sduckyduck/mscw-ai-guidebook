import { useEffect, useMemo, useState } from 'react';

const OSMS_DATA_BASE = 'https://sduckyduck.github.io/osms-classic-guidebook/data/';

function stripKnownPrefixes(value) {
  let text = String(value || '').trim();
  text = text.replace(/^https?:\/\/sduckyduck\.github\.io\/mscw-guidebook\//i, '');
  text = text.replace(/^https?:\/\/sduckyduck\.github\.io\/osms-classic-guidebook\/data\//i, '');
  text = text.replace(/^\/?mscw-guidebook\//i, '');
  text = text.replace(/^\/?AppData\//i, '');
  text = text.replace(/^\/?data\//i, '');
  text = text.replace(/^\.\//, '').replace(/^\//, '');
  return text;
}

function isRemote(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function localBase() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function getOsmsDataFallback(path) {
  const clean = stripKnownPrefixes(path);
  return clean ? `${OSMS_DATA_BASE}${clean}` : '';
}

export function getLocalAppDataPath(path) {
  if (!path) return '';
  const text = String(path);
  if (isRemote(text)) return text;
  if (text.startsWith('/')) return text;
  const clean = stripKnownPrefixes(text);
  return clean ? `${localBase()}AppData/${clean}` : '';
}

export function getImageSources(path, extra = []) {
  const all = [path, ...extra].filter(Boolean);
  const out = [];
  for (const item of all) {
    if (isRemote(item) || String(item).startsWith('/')) out.push(String(item));
    out.push(getLocalAppDataPath(item));
    out.push(getOsmsDataFallback(item));
  }
  return [...new Set(out.filter(Boolean))];
}

export default function OsmsDataImage({ src, sources = [], alt = '', className = '', style, placeholder = '—' }) {
  const [index, setIndex] = useState(0);
  const candidates = useMemo(() => getImageSources(src, sources), [src, sources]);

  useEffect(() => setIndex(0), [src, JSON.stringify(sources)]);

  if (!candidates[index]) {
    return <span className={className} style={style}>{placeholder}</span>;
  }

  return (
    <img
      className={className}
      src={candidates[index]}
      alt={alt}
      style={style}
      onError={() => setIndex((value) => value + 1)}
    />
  );
}
