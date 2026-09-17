import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(resolve(process.cwd(), 'globals.css'), 'utf8')
  .replace(/\s+/g, ' ')
  .replace(/,\s+/g, ',');

describe('architecture card actions', () => {
  it('lets API-less component content use the full card width', () => {
    const apiLessNode = styles.match(/\.inventory-app \.architecture-node\.without-provider-apis \{([^}]*)\}/)?.[1] ?? '';
    const fullBody = styles.match(/\.inventory-app \.architecture-node-body\.full \{([^}]*)\}/)?.[1] ?? '';

    expect(apiLessNode).toContain('grid-template-columns: minmax(0,1fr)');
    expect(fullBody).toContain('width: 100%');
    expect(fullBody).toContain('background: var(--app-surface)');
  });

  it('places its controls above the card top-right corner without covering title content', () => {
    const actions = styles.match(/\.inventory-app \.architecture-node-actions \{([^}]*)\}/)?.[1] ?? '';
    const body = styles.match(/\.inventory-app \.architecture-node-body \{([^}]*)\}/)?.[1] ?? '';
    const controls = styles.match(/\.inventory-app \.architecture-node-open \{([^}]*)\}/)?.[1] ?? '';

    expect(actions).toContain('pointer-events: auto');
    expect(actions).toContain('position: absolute');
    expect(actions).toContain('top: -44px');
    expect(actions).toContain('right: 0');
    expect(body).toContain('padding: 20px');
    expect(controls).toContain('pointer-events: auto');
    expect(controls).toContain('width: 32px');
    expect(controls).toContain('height: 32px');
    expect(controls).toContain('background: var(--app-subtle)');
  });

  it('keeps component names above the active full-card tooltip trigger', () => {
    const body = styles.match(/\.inventory-app \.architecture-node-body \{([^}]*)\}/)?.[1] ?? '';
    const trigger = styles.match(/\.inventory-app \.architecture-node-trigger \{([^}]*)\}/)?.[1] ?? '';

    expect(trigger).toContain('z-index: 1');
    expect(body).toContain('z-index: 2');
  });

  it('aligns queue and stream titles while leaving breathing room below stable API rows', () => {
    const heading = styles.match(/\.inventory-app \.architecture-stream-header \.architecture-node-heading \{([^}]*)\}/)?.[1] ?? '';
    const titleLine = styles.match(/\.inventory-app \.architecture-stream-title-line \{([^}]*)\}/)?.[1] ?? '';
    const systemType = styles.match(/\.inventory-app \.architecture-stream-system-type \{([^}]*)\}/)?.[1] ?? '';
    const list = styles.match(/\.inventory-app \.architecture-stream-api-list \{([^}]*)\}/)?.[1] ?? '';
    const row = styles.match(/\.inventory-app \.architecture-stream-api-row \{([^}]*)\}/)?.[1] ?? '';
    const type = styles.match(/\.inventory-app \.architecture-stream-api-type \{([^}]*)\}/)?.[1] ?? '';

    expect(heading).toContain('width: 100%');
    expect(titleLine).toContain('display: flex');
    expect(titleLine).toContain('align-items: center');
    expect(systemType).toContain('margin-left: auto');
    expect(list).toContain('padding-bottom: 6px');
    expect(row).toContain('min-height: 60px');
    expect(type).toContain('width: max-content');
    expect(type).toContain('justify-self: start');
  });

  it('keeps the client-model grid inside cards with only one populated rail', () => {
    expect(styles).toContain('.inventory-app .architecture-node-client-model.has-clients:not(.has-apis) { grid-template-columns: minmax(238px,1fr) 130px; }');
    expect(styles).toContain('.inventory-app .architecture-node-client-model:not(.has-apis):not(.has-clients) { grid-template-columns: minmax(238px,1fr); }');
  });

  it('keeps client badges on the Kafka target width and wraps longer labels', () => {
    const badge = styles.match(/\.inventory-app \.architecture-node-client-model \.architecture-client-badge \{([^}]*)\}/)?.[1] ?? '';
    expect(styles).toContain('grid-template-columns: minmax(238px,1fr) 130px');
    expect(badge).toContain('white-space: normal');
    expect(badge).toContain('overflow-wrap: anywhere');
  });

  it('pins new-model connection points to the card border', () => {
    expect(styles).toContain('.inventory-app .architecture-node-client-model .architecture-api-handle.react-flow__handle-left { left: -1px;');
    expect(styles).toContain('.inventory-app .architecture-node-client-model .architecture-client-handle.react-flow__handle-right { right: -1px;');
  });
});
