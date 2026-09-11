import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'globals.css'), 'utf8');

describe('architecture card actions', () => {
  it('places its controls above the card top-right corner without covering title content', () => {
    const actions = styles.match(/\.inventory-app \.architecture-node-actions \{([^}]*)\}/)?.[1] ?? '';
    const body = styles.match(/\.inventory-app \.architecture-node-body \{([^}]*)\}/)?.[1] ?? '';
    const controls = styles.match(/\.inventory-app \.architecture-node-drag-handle, \.inventory-app \.architecture-node-open \{([^}]*)\}/)?.[1] ?? '';

    expect(actions).toContain('pointer-events: auto');
    expect(actions).toContain('position: absolute');
    expect(actions).toContain('top: -44px');
    expect(actions).toContain('right: 0');
    expect(body).toContain('padding: 20px');
    expect(controls).toContain('pointer-events: auto');
    expect(controls).toContain('width: 32px');
    expect(controls).toContain('height: 32px');
    expect(controls).toContain('background: rgba(7,12,20,.34)');
  });
});
