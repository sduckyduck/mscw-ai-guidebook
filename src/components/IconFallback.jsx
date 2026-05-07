import { useEffect, useMemo, useState } from 'react';

const IMAGE_EXTENSIONS = ['png', 'webp', 'gif', 'jpg', 'jpeg'];
const REPO_ICON_API = 'https://api.github.com/repos/sduckyduck/mscw-guidebook/contents/public/icons?ref=main';
const IMAGE_RE = /\.(png|webp|gif|jpe?g)$/i;

let iconFilesPromise = null;
let iconFilesCache = null;
let debugInstalled = false;

export function baseUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function slugifyIconName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\bjr\.?\b/g, 'jr')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeKey(value) {
  return slugifyIconName(value).replace(/-/g, '');
}

function stripExt(value) {
  return String(value || '').replace(/\.(png|webp|gif|jpe?g)$/i, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function iconSourcesFromNames(names, folders = ['icons'], extensions = IMAGE_EXTENSIONS) {
  const root = `${baseUrl()}icons`;
  const output = [];
  for (const rawName of names.filter(Boolean)) {
    const clean = stripExt(String(rawName).replace(/^\/+/, ''));
    const slug = slugifyIconName(clean);
    const variants = unique([clean, slug, slug.replace(/-/g, '_'), slug.replace(/-/g, '')]);
    for (const folder of folders) {
      const folderPath = folder.replace(/^\/+|\/+$/g, '');
      for (const variant of variants) {
        for (const ext of extensions) {
          output.push(`${baseUrl()}${folderPath}/${variant}.${ext}`);
        }
      }
    }
    for (const variant of variants) {
      for (const ext of extensions) {
        output.push(`${root}/${variant}.${ext}`);
      }
    }
  }
  return unique(output);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function sameOriginPublicIconUrl(entry) {
  const path = String(entry?.path || '').replace(/^public\//, '');
  return path ? `${baseUrl()}${path}` : entry?.download_url;
}

async function walkGithubContents(url, depth = 0) {
  if (depth > 5) return [];
  const entries = await fetchJson(url);
  if (!Array.isArray(entries)) return [];
  const files = [];

  for (const entry of entries) {
    if (entry.type === 'file' && IMAGE_RE.test(entry.name)) {
      files.push({
        name: entry.name,
        path: entry.path,
        url: sameOriginPublicIconUrl(entry),
        folder: entry.path.split('/').slice(0, -1).join('/'),
      });
    }
    if (entry.type === 'dir' && entry.url) {
      const nested = await walkGithubContents(entry.url, depth + 1).catch(() => []);
      files.push(...nested);
    }
  }

  return files;
}

export async function getIconFiles({ force = false } = {}) {
  if (iconFilesCache && !force) return iconFilesCache;
  if (!iconFilesPromise || force) {
    iconFilesPromise = walkGithubContents(REPO_ICON_API).then((files) => {
      iconFilesCache = files;
      return files;
    });
  }
  return iconFilesPromise;
}

function cleanFolder(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^public\//, '')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function folderMatches(file, folders) {
  if (!folders?.length) return true;
  const normalizedFileFolder = cleanFolder(file.folder);
  return folders.some((folder) => {
    const clean = cleanFolder(folder);
    if (!clean) return false;
    return clean === 'icons'
      || normalizedFileFolder === clean
      || normalizedFileFolder.startsWith(`${clean}/`)
      || normalizedFileFolder.endsWith(`/${clean}`)
      || normalizedFileFolder.includes(`/${clean}/`);
  });
}

function scoreFile(file, names, folders) {
  if (!folderMatches(file, folders)) return -1;
  const fileBase = normalizeKey(stripExt(file.name));
  const filePath = normalizeKey(stripExt(file.path));
  const queryKeys = unique(names.map((name) => normalizeKey(name)).filter(Boolean));
  if (!queryKeys.length) return -1;

  let score = -1;
  for (const key of queryKeys) {
    if (!key) continue;
    if (fileBase === key) score = Math.max(score, 100);
    else if (filePath.endsWith(key)) score = Math.max(score, 92);
    else if (fileBase.includes(key) || key.includes(fileBase)) score = Math.max(score, 76);
    else if (filePath.includes(key)) score = Math.max(score, 58);
  }

  const folderBonus = folders?.some((folder) => cleanFolder(file.folder).startsWith(cleanFolder(folder))) ? 8 : 0;
  return score < 0 ? score : score + folderBonus;
}

export async function discoverIconSources(names, folders = ['icons'], { limit = 8, force = false } = {}) {
  const files = await getIconFiles({ force });
  return files
    .map((file) => ({ file, score: scoreFile(file, names, folders) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))
    .slice(0, limit)
    .map((item) => item.file.url);
}

export function installIconDebugger() {
  if (typeof window === 'undefined' || debugInstalled) return;
  debugInstalled = true;

  window.MSCWIcons = {
    list: async (force = false) => {
      const files = await getIconFiles({ force });
      console.table(files.map((file) => ({ name: file.name, path: file.path, url: file.url })));
      return files;
    },
    find: async (query, folders = ['icons']) => {
      const names = Array.isArray(query) ? query : [query];
      const files = await getIconFiles();
      const result = files
        .map((file) => ({ ...file, score: scoreFile(file, names, folders) }))
        .filter((file) => file.score >= 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
      console.table(result.map((file) => ({ score: file.score, name: file.name, path: file.path, url: file.url })));
      return result;
    },
    test: async (query, folders = ['icons']) => {
      const names = Array.isArray(query) ? query : [query];
      const guessed = iconSourcesFromNames(names, folders);
      const discovered = await discoverIconSources(names, folders, { limit: 20 });
      const all = unique([...guessed, ...discovered]);
      const checks = await Promise.all(all.map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          return { ok: res.ok, status: res.status, url };
        } catch (error) {
          return { ok: false, status: 'ERR', url };
        }
      }));
      console.table(checks);
      return checks;
    },
    clearCache: () => {
      iconFilesCache = null;
      iconFilesPromise = null;
      console.log('MSCW icon cache cleared');
    },
  };

  console.info('MSCW icon debug ready. Try: await MSCWIcons.list(), await MSCWIcons.find("book"), await MSCWIcons.test("Zombie Mushroom", ["icons/monsters", "icons"])');
}

installIconDebugger();

export default function IconFallback({
  sources = [],
  names = [],
  folders = ['icons'],
  alt = '',
  className = '',
  style,
  fallback = null,
  onLoad,
  debugLabel = '',
}) {
  const staticList = useMemo(() => unique(sources), [sources.join('|')]);
  const nameList = useMemo(() => unique(names), [names.join('|')]);
  const folderList = useMemo(() => unique(folders), [folders.join('|')]);
  const [discovered, setDiscovered] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let stopped = false;
    if (!nameList.length) {
      setDiscovered([]);
      return () => { stopped = true; };
    }
    discoverIconSources(nameList, folderList).then((found) => {
      if (!stopped) setDiscovered(found);
    }).catch(() => {
      if (!stopped) setDiscovered([]);
    });
    return () => { stopped = true; };
  }, [nameList.join('|'), folderList.join('|')]);

  const list = useMemo(() => unique([...staticList, ...discovered]), [staticList.join('|'), discovered.join('|')]);

  useEffect(() => setIndex(0), [list.join('|')]);

  if (!list[index]) {
    if (debugLabel && typeof window !== 'undefined') {
      window.__MSCW_LAST_MISSING_ICON__ = { debugLabel, names: nameList, folders: folderList, tried: list };
    }
    return fallback;
  }

  return (
    <img
      className={className}
      src={list[index]}
      alt={alt}
      draggable="false"
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={() => setIndex((value) => value + 1)}
      style={style}
    />
  );
}
