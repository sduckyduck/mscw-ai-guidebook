import { useEffect, useMemo, useState } from 'react';

const API_REGION = 'MCW';
const API_VERSION = '1';

function idNum(value) {
  const n = Number(String(value ?? '').replace(/^0+/, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getMappedMsioItemId(item) {
  return idNum(item?.id);
}

export function getMsioIconUrl(item) {
  const id = getMappedMsioItemId(item);
  return id ? `https://maplestory.io/api/${API_REGION}/${API_VERSION}/item/${id}/icon` : '';
}

export default function MsioItemIcon({ item, size = 32 }) {
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [item?.id, item?.thumbnail]);

  const sources = useMemo(() => [getMsioIconUrl(item), item?.thumbnail].filter(Boolean), [item]);

  return (
    <div style={{ width: size + 8, height: size + 8, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 10, background: '#fff', marginBottom: 5 }}>
      {sources[sourceIndex] ? (
        <img
          src={sources[sourceIndex]}
          alt=""
          onError={() => setSourceIndex((value) => value + 1)}
          style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      ) : (
        <span style={{ color: '#b8c2cc', fontWeight: 1000 }}>-</span>
      )}
    </div>
  );
}
