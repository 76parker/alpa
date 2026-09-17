import { describe, expect, it } from 'vitest';
import type { Component } from './contracts';
import { apiHandleID, architectureNodeHeight, architectureNodeWidth, buildArchitectureGraph, clientHandleID, consumerHandleID, providerHandleID } from './architecture-graph';

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
];

describe('buildArchitectureGraph', () => {
  it('connects each bound client to its exact API and leaves unbound clients visible without an edge', () => {
    const componentsWithClients: Component[] = [
      {
        id: 70,
        product_id: 1,
        name: 'Checkout Service',
        type: 'backend-service',
        description: '',
        details: { language: 'Go', language_version: '1.25', framework: 'Gin' },
        apis: [{ id: 701, name: 'Checkout API', api_type: 'rest', network_exposure: 'internal' }],
        clients: [],
      },
      {
        id: 71,
        product_id: 1,
        name: 'Checkout UI',
        type: 'frontend-service',
        description: '',
        details: { language: 'TypeScript', language_version: '5', framework: 'React' },
        apis: [],
        clients: [
          { id: 711, client_type: 'rest-client', description: 'Calls checkout', api_id: 701 },
          { id: 712, client_type: 'graphql-client', description: 'Not connected yet', api_id: null },
          { id: 713, client_type: 'grpc-client', description: 'Binding pending', api_id: null },
        ],
      },
    ];

    const { nodes, edges } = buildArchitectureGraph(componentsWithClients);
    const uiNode = nodes.find((node) => node.id === 'component-71')!;
    expect(uiNode.data.apis).toEqual([]);
    expect(uiNode.data.clients.map((client) => client.id)).toEqual([711, 712, 713]);
    expect(edges).toEqual([expect.objectContaining({
      source: 'component-71',
      sourceHandle: clientHandleID(711),
      target: 'component-70',
      targetHandle: apiHandleID(701),
    })]);
    expect(edges.some((edge) => edge.sourceHandle === clientHandleID(712))).toBe(false);
    expect(edges.some((edge) => edge.sourceHandle === clientHandleID(713))).toBe(false);
  });

  it('groups the default layout into stable component-type columns', () => {
    const groupedComponents: Component[] = [
      components[1],
      components[0],
      { ...components[0], id: 11, name: 'Payments UI', type: 'frontend-service', apis: [] } as Component,
      { id: 12, product_id: 1, name: 'Kafka', type: 'infrastructure', description: '', details: { system: 'Kafka', system_type: 'queue/stream', version: '3', network_address: [] }, apis: [] } as Component,
    ].map((component): Component => ({ ...component, clients: [] }));

    const { nodes } = buildArchitectureGraph(groupedComponents);
    const xByType = new Map(groupedComponents.map((component) => [component.type, nodes.find((node) => node.id === `component-${component.id}`)!.position.x]));
    expect(xByType.get('infrastructure')).toBeGreaterThan(xByType.get('backend-service')!);
    expect(xByType.get('frontend-service')).toBeGreaterThan(xByType.get('infrastructure')!);
  });

  it('does not reserve API or client rail space for an empty component', () => {
    const empty: Component = { ...components[0], id: 99, apis: [], clients: [] };
    const withAPI = { ...empty, apis: [{ id: 990, name: 'Health', api_type: 'rest' as const, network_exposure: 'internal' as const }] };
    const withClient = { ...empty, clients: [{ id: 991, client_type: 'rest-client' as const, description: 'Calls health' }] };
    expect(architectureNodeWidth(empty)).toBe(238);
    expect(architectureNodeWidth(empty)).toBeLessThan(architectureNodeWidth(withAPI));
    expect(architectureNodeWidth(empty)).toBeLessThan(architectureNodeWidth(withClient));
  });

  it('keeps the client rail width fixed when a client label is longer than Kafka', () => {
    const kafkaClient: Component = {
      ...components[0],
      id: 98,
      apis: [],
      clients: [{ id: 981, client_type: 'kafka-client', description: '' }],
    };
    const longClient: Component = {
      ...components[0],
      id: 97,
      apis: [],
      clients: [{ id: 971, client_type: 'azure-service-bus-client', description: '' }],
    };

    expect(architectureNodeWidth(longClient)).toBe(architectureNodeWidth(kafkaClient));
  });

  it('reserves a spacious base height for a component card', () => {
    expect(architectureNodeHeight(components[0])).toBe(116);
  });

  it('creates one stable node per component with provider API type badges', () => {
    const { nodes } = buildArchitectureGraph(components);

    expect(nodes.map((node) => node.id)).toEqual(['component-10', 'component-20']);
    expect(nodes[0].position.x).toBeLessThan(nodes[1].position.x);
    expect(nodes[0].dragHandle).toBe('.architecture-node-drag-handle');
    expect(nodes[1].data.providerAPIs.map((api) => api.api_type)).toEqual(['rest', 'event']);
    expect(nodes[0].data.component).toBe(components[0]);
  });

  it('points each consumer component to the matching provider component', () => {
    const { edges } = buildArchitectureGraph(components);

    expect(edges).toEqual([
      expect.objectContaining({ id: 'edge-10-301', source: 'component-10', sourceHandle: consumerHandleID(301), target: 'component-20', targetHandle: providerHandleID(301) }),
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
        ...components[0],
        id: 40,
        name: 'External Worker',
        apis: [{ id: 999, name: 'External API', api_type: 'rest', network_exposure: 'internet', role: 'consumer' }],
      },
    ]);

    expect(edges.some((edge) => edge.source === 'component-10' && edge.target === 'component-10')).toBe(false);
    expect(edges.some((edge) => edge.source === 'component-50' || edge.target === 'component-50')).toBe(false);
    expect(edges.map((edge) => edge.id)).toEqual(['edge-10-301']);
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

    expect(edges.filter((edge) => edge.target === 'component-20')).toHaveLength(2);
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

    expect(longTitleWidth).toBe(636);
    expect(providerNode.position.x).toBe(longTitleNode.position.x + longTitleWidth + 80);
  });

  it('uses a bounded message-broker card size without changing ordinary nodes', () => {
    const queueStreamComponent: Component = {
      id: 40,
      product_id: 1,
      name: 'Kafka',
      type: 'infrastructure',
      description: '',
      details: { system: 'Apache Kafka', system_type: 'queue/stream', version: '4.1', network_address: [] },
      apis: [
        { id: 401, name: 'orders.cancellation', api_type: 'topic', network_exposure: 'internal', role: 'provider' },
        { id: 402, name: 'orders.completion', api_type: 'queue', network_exposure: 'internal', role: 'provider' },
      ],
    };
    const longNameComponent: Component = {
      ...queueStreamComponent,
      id: 41,
      apis: [{ ...queueStreamComponent.apis[0], name: 'x'.repeat(100) }],
    };
    const ordinaryComponent: Component = {
      id: 42,
      product_id: 1,
      name: 'API',
      type: 'backend-service',
      description: '',
      details: { language: 'Go', language_version: '', framework: '' },
      apis: [{ id: 403, name: 'x'.repeat(100), api_type: 'topic', network_exposure: 'internal', role: 'provider' }],
    };

    expect(architectureNodeWidth(queueStreamComponent)).toBe(320);
    expect(architectureNodeWidth(longNameComponent)).toBe(440);
    expect(architectureNodeHeight(queueStreamComponent)).toBe(204);
    expect(architectureNodeWidth(ordinaryComponent)).toBe(316);
  });

  it('keeps the title container width stable when an ordinary component has no APIs', () => {
    const withoutAPIs: Component = {
      id: 40,
      product_id: 1,
      name: 'Settlement Worker',
      type: 'backend-service',
      description: '',
      details: { language: 'Go', language_version: '1.25', framework: '' },
      apis: [],
    };
    const withAPI: Component = {
      ...withoutAPIs,
      id: 41,
      apis: [{ id: 401, name: 'settlements', api_type: 'topic', network_exposure: 'internal', role: 'provider' }],
    };

    expect(architectureNodeWidth(withoutAPIs)).toBe(architectureNodeWidth(withAPI));
  });
});
