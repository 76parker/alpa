import type { CSSProperties } from 'react';

const identiconColors = ['#e06c75', '#d19a66', '#e5c07b', '#98c379', '#56b6c2', '#61afef', '#c678dd'];

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function identiconCells(seed: string) {
  let state = hashSeed(seed) || 0x811c9dc5;
  const half = Array.from({ length: 15 }, () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % 2 === 0;
  });

  if (!half.some(Boolean)) half[7] = true;

  return Array.from({ length: 25 }, (_, index) => {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const mirroredColumn = column < 3 ? column : 4 - column;
    return half[row * 3 + mirroredColumn];
  });
}

export function EntityAvatar({
  seed,
  name,
  avatarUrl,
  className = '',
}: {
  seed: string;
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <span className={`${className} entity-avatar-image`} aria-hidden="true">
        {/* The prototype accepts arbitrary local or remote avatar URLs, so they cannot use a fixed Next image allowlist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" />
      </span>
    );
  }

  const normalizedSeed = seed || name;
  const color = identiconColors[hashSeed(normalizedSeed) % identiconColors.length];
  const style = { '--identicon-color': color } as CSSProperties;

  return (
    <span className={`${className} entity-identicon`} style={style} aria-hidden="true">
      {identiconCells(normalizedSeed).map((filled, index) => (
        <i className={filled ? 'filled' : undefined} key={index} />
      ))}
    </span>
  );
}
