import { describe, expect, it } from 'vitest';
import type { Component } from './contracts';
import { architectureNodeHeight, buildArchitectureGraph, consumerHandleID, providerHandleID } from './architecture-graph';

const components: Component[] = [
  {
    id: 10,
    product_id: 1,
    name: 'Checkout UI',
    type: 'frontend-service',
    description: 'Accepts customer checkout input.',
    details: { language: 'TypeScript', language_version: '5', framework: 'React' },
    apis: [
      { id: 301, name: 'Checkout API', api_type: 'rest', network_exposure: 'internal', role: 'consumer' },
      { id: 303, name: 'Local callback', api_type: 'rest', network_exposure: 'internal', role: 'consumer' },
    ],
  },
  {
    id: 20,
    product_id: 1,
    name: 'Checkout Service',
    type: 'backend-service',
    description: 'Runs checkout orchestration.',
    details: { language: 'Go', language_version: '1.25', framework: 'Gin' },
    apis: [
      { id: 301, name: 'Checkout API', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
      { id: 302, name: 'Events', api_type: 'event', network_exposure: 'internal', role: 'provider' },
    ],
  },
  {
    id: 30,
    product_id: 1,
    name: 'Ledger Worker',
    type: 'background-worker',
    description: 'Records payment events.',
    details: { language: 'Go', language_version: '1.25', framework: '', broker: 'kafka' },
    apis: [
      { id: 302, name: 'Events', api_type: 'event', network_exposure: 'internal', role: 'consumer' },
    ],
  },
];

describe('buildArchitectureGraph', () => {
  it('reserves a spacious base height for a component card', () => {
    expect(architectureNodeHeight(components[0])).toBe(116);
  });

  it('creates one stable node per component with provider API type badges', () => {
    const { nodes } = buildArchitectureGraph(components);

    expect(nodes.map((node) => node.id)).toEqual(['component-10', 'component-20', 'component-30']);
    expect(nodes[0].position.x).toBeLessThan(nodes[1].position.x);
    expect(nodes[2].position.x).toBeLessThan(nodes[1].position.x);
    expect(nodes[0].position.y).not.toBe(nodes[2].position.y);
    expect(nodes[0].dragHandle).toBe('.architecture-node-drag-handle');
    expect(nodes[1].data.providerAPIs.map((api) => api.api_type)).toEqual(['rest', 'event']);
    expect(nodes[0].data.component).toBe(components[0]);
  });

  it('points each consumer component to the matching provider component', () => {
    const { edges } = buildArchitectureGraph(components);

    expect(edges).toEqual([
      expect.objectContaining({ id: 'edge-10-301', source: 'component-10', sourceHandle: consumerHandleID(301), target: 'component-20', targetHandle: providerHandleID(301) }),
      expect.objectContaining({ id: 'edge-30-302', source: 'component-30', sourceHandle: consumerHandleID(302), target: 'component-20', targetHandle: providerHandleID(302) }),
    ]);
  });

  it('ignores unmatched and self-referencing consumer APIs', () => {
    const { edges } = buildArchitectureGraph([
      ...components,
      {
        id: 50,
        product_id: 1,
        name: 'Self-referencing service',
        type: 'backend-service',
        description: '',
        details: { language: 'Go', language_version: '', framework: '' },
        apis: [
          { id: 505, name: 'Internal API', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
          { id: 505, name: 'Internal API', api_type: 'rest', network_exposure: 'internal', role: 'consumer' },
        ],
      },
      {
        ...components[2],
        id: 40,
        name: 'External Worker',
        apis: [{ id: 999, name: 'External API', api_type: 'rest', network_exposure: 'internet', role: 'consumer' }],
      },
    ]);

    expect(edges.some((edge) => edge.source === 'component-10' && edge.target === 'component-10')).toBe(false);
    expect(edges.some((edge) => edge.source === 'component-50' || edge.target === 'component-50')).toBe(false);
    expect(edges.map((edge) => edge.id)).toEqual(['edge-10-301', 'edge-30-302']);
  });

  it('allows multiple consumers to reference one provider API', () => {
    const { edges } = buildArchitectureGraph([
      ...components,
      {
        ...components[0],
        id: 40,
        name: 'Mobile Checkout',
        apis: [{ id: 302, name: 'Events', api_type: 'event', network_exposure: 'internal', role: 'consumer' }],
      },
    ]);

    expect(edges.filter((edge) => edge.target === 'component-20')).toHaveLength(3);
    expect(edges.find((edge) => edge.id === 'edge-40-302')).toEqual(expect.objectContaining({ source: 'component-40', target: 'component-20' }));
  });

  it('uses a compact title width budget and separates dependency layers', () => {
    const longName = 'Internationalized payment authorization reconciliation coordinator';
    const { nodes } = buildArchitectureGraph([
      ...components,
      {
        ...components[0],
        id: 40,
        name: longName,
        apis: [{ id: 301, name: 'Checkout API', api_type: 'rest', network_exposure: 'internal', role: 'consumer' }],
      },
    ]);

    const longTitleNode = nodes.find((node) => node.id === 'component-40')!;
    const providerNode = nodes.find((node) => node.id === 'component-20')!;
    const longTitleWidth = Number(longTitleNode.style?.width);

    expect(longTitleWidth).toBe(558);
    expect(providerNode.position.x).toBe(longTitleNode.position.x + longTitleWidth + 36);
  });

  it('expands a node for a long component type even when its name is short', () => {
    const longType = 'background-worker';
    const { nodes } = buildArchitectureGraph([{
      id: 40,
      product_id: 1,
      name: 'API',
      type: longType,
      description: '',
      details: { language: 'Go', language_version: '1.25', framework: '', broker: 'kafka' },
      apis: [],
    }]);

    expect(Number(nodes[0].style?.width)).toBeGreaterThanOrEqual(96 + Array.from(longType).length * 7);
  });
});
