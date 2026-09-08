'use client';

import {
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Clock3,
  CloudUpload,
  ContactRound,
  Database,
  ExternalLink,
  FileSearch,
  Filter,
  GitBranch,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Menu,
  Network,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldEllipsis,
  SlidersHorizontal,
  Server,
  Upload,
  UsersRound,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cloneDemoState } from '../lib/demo-data';
import { parseRoute, serializeRoute, type AtlasRoute } from '../lib/routes';
import type {
  ApplicationResource,
  AtlasState,
  Component,
  ComponentApiType,
  ComponentKind,
  ControlType,
  CoverageEvaluation,
  CoverageStatus,
  Finding,
  FindingSeverity,
  FindingStatus,
  InfrastructureCatalogItem,
  InfrastructureCategory,
  Integration,
  Locale,
  Product,
  RiskException,
  Team,
  Threat,
  ThreatModelStatus,
  TopologyEdge,
  TopologyEdgeType,
  TopologyNode,
} from '../lib/domain';
import { EntityAvatar } from './entity-avatar';
import { FieldLabel } from './field-label';
import { InventoryApp } from './inventory/inventory-app';
import { InventoryProvider } from './inventory/inventory-context';
import { SearchField } from './search-field';
import { TopologyMap } from './topology-map';

type ViewId = 'overview' | 'products' | 'infrastructure' | 'teams' | 'settings';
type ProductTab = 'overview' | 'architecture' | 'threat-model';
type ComponentTab = 'summary' | 'checks';
type SettingsTab = 'profiles' | 'integrations';
type ModalKind = 'create' | 'upload' | 'exception' | 'relation' | 'threat' | null;
type Drawer = { kind: 'finding' | 'topology'; id: string; topologyKind?: 'node' | 'edge' } | null;
type ReportControl = Exclude<ControlType, 'Threat Model'>;
type ReportUploadTarget = { componentId?: string; control?: ReportControl };
type RecentItemRef = { kind: 'product' | 'component'; id: string };
type RecentItem = { kind: 'product'; entity: Product } | { kind: 'component'; entity: Component };
type ProductDraft = {
  name: string;
  key: string;
  description: string;
  teamId: string;
  criticality: Product['criticality'];
  exposure: Product['exposure'];
  productOwnerName: string;
  productOwnerEmail: string;
};
type ProductDraftField = keyof ProductDraft;
type ProductDraftErrors = Partial<Record<'name' | 'key' | 'teamId' | 'productOwnerName' | 'productOwnerEmail', string>>;

const STORAGE_KEY = 'appsec-atlas-demo-v4';
const defaultRecentItems: RecentItemRef[] = [
  { kind: 'component', id: 'identity-api' },
  { kind: 'product', id: 'identity' },
  { kind: 'component', id: 'checkout-web' },
  { kind: 'product', id: 'checkout' },
  { kind: 'component', id: 'orders-api' },
  { kind: 'product', id: 'developer' },
];
const controlTypes: ControlType[] = ['SAST', 'SCA', 'Secrets', 'IaC', 'Threat Model'];
const componentControlTypes: ControlType[] = ['SAST', 'SCA', 'Secrets', 'IaC'];
const componentApiTypes: ComponentApiType[] = ['REST', 'gRPC', 'GraphQL', 'WebSocket', 'Event-driven', 'Not applicable'];
const productCriticalities: Product['criticality'][] = ['Mission-Critical', 'Business-Critical', 'Business-Operational', 'Office-Productivity'];
const findingStatuses: FindingStatus[] = ['Needs triage', 'Confirmed', 'In progress', 'Resolved', 'False positive'];
const infrastructureCategories: InfrastructureCategory[] = ['Database', 'Queue/Stream', 'Object Storage', 'Deployment Environment', 'Cache', 'Other'];

const navigation: Array<{ id: ViewId; icon: LucideIcon; ru: string; en: string }> = [
  { id: 'overview', icon: LayoutGrid, ru: 'Дашборд', en: 'Dashboard' },
  { id: 'products', icon: Package, ru: 'Продукты', en: 'Products' },
  { id: 'infrastructure', icon: Server, ru: 'Шаблоны', en: 'Templates' },
  { id: 'teams', icon: UsersRound, ru: 'Команды', en: 'Teams' },
];

const statusCopy: Record<CoverageStatus, { ru: string; en: string }> = {
  Healthy: { ru: 'Актуально', en: 'Healthy' },
  Stale: { ru: 'Устарело', en: 'Stale' },
  Gap: { ru: 'Пробел', en: 'Gap' },
  Error: { ru: 'Ошибка', en: 'Error' },
  Unknown: { ru: 'Нет данных', en: 'Unknown' },
  'Not applicable': { ru: 'Не требуется', en: 'Not applicable' },
};

function slug(value: string) {
  return value.toLowerCase().replaceAll(' ', '-');
}

function externalHttpUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function inferComponentApiType(component: Component): ComponentApiType {
  if (component.kind === 'Infrastructure Component') return 'Not applicable';
  const legacyType = component.technologies.find((technology) => componentApiTypes.includes(technology as ComponentApiType));
  if (legacyType) return legacyType as ComponentApiType;
  if (component.name.toLowerCase().includes('worker')) return 'Event-driven';
  return 'REST';
}

function appLocale(): Locale {
  return 'en';
}

function formatDate(value: string | undefined, locale: Locale, withTime = false) {
  if (!value) return locale === 'ru' ? 'Нет данных' : 'No data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', withTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function isAtlasState(value: unknown): value is AtlasState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['products', 'components', 'infrastructureCatalog', 'repositories', 'resources', 'teams', 'topologyNodes', 'topologyEdges', 'findings', 'scanReports', 'threatModels', 'threats', 'coverage', 'profiles', 'exceptions', 'integrations']
    .every((key) => Array.isArray(candidate[key]));
}

function normalizeProductCriticality(value: unknown): Product['criticality'] {
  if (value === 'Mission-Critical' || value === 'Business-Critical' || value === 'Business-Operational' || value === 'Office-Productivity') return value;
  if (value === 'Critical') return 'Mission-Critical';
  if (value === 'High') return 'Business-Critical';
  return 'Office-Productivity';
}

function normalizeInfrastructureCategory(value: unknown): InfrastructureCategory {
  if (value === 'Message Broker') return 'Queue/Stream';
  return infrastructureCategories.includes(value as InfrastructureCategory) ? value as InfrastructureCategory : 'Other';
}

function infrastructureCategoryLabel(category: InfrastructureCategory, locale: Locale) {
  const labels: Record<InfrastructureCategory, { ru: string; en: string }> = {
    Database: { ru: 'База данных', en: 'Database' },
    'Queue/Stream': { ru: 'Очередь / поток', en: 'Queue / Stream' },
    'Object Storage': { ru: 'Объектное хранилище', en: 'Object Storage' },
    'Deployment Environment': { ru: 'Среда развёртывания', en: 'Deployment Environment' },
    Cache: { ru: 'Кэш', en: 'Cache' },
    Other: { ru: 'Другое', en: 'Other' },
  };
  return labels[category][locale];
}

function migrateStoredData(data: AtlasState): AtlasState {
  const defaults = cloneDemoState();
  const defaultProducts = new Map(defaults.products.map((product) => [product.id, product]));
  const defaultComponents = new Map(defaults.components.map((component) => [component.id, component]));
  const teams = new Map(data.teams.map((team) => [team.id, team]));
  return {
    ...data,
    teams: data.teams.map((team) => ({
      ...team,
      leadEmail: team.leadEmail || (team.lead === 'Unassigned' ? '' : `${team.lead.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')}@acme.com`),
    })),
    products: data.products.map((product) => {
      const defaultProduct = defaultProducts.get(product.id);
      const owningTeam = teams.get(product.ownerTeamId);
      return {
        ...product,
        criticality: normalizeProductCriticality(product.criticality),
        productOwnerName: product.productOwnerName || defaultProduct?.productOwnerName || owningTeam?.lead || 'Unassigned',
        productOwnerEmail: product.productOwnerEmail || defaultProduct?.productOwnerEmail || owningTeam?.leadEmail || '',
      };
    }),
    components: data.components.map((component) => {
      const defaultComponent = defaultComponents.get(component.id);
      const defaultDeployments = new Map(defaultComponent?.deployments.map((deployment) => [deployment.id, deployment]) ?? []);
      return {
        ...component,
        apiType: component.apiType || defaultComponent?.apiType || inferComponentApiType(component),
        technologies: component.technologies.filter((technology) => !componentApiTypes.includes(technology as ComponentApiType)),
        deployments: (component.deployments ?? []).map((deployment) => ({
          ...deployment,
          url: deployment.url || defaultDeployments.get(deployment.id)?.url,
        })),
      };
    }),
    infrastructureCatalog: data.infrastructureCatalog.map((item) => ({ ...item, componentKind: item.componentKind || 'Infrastructure Component', category: normalizeInfrastructureCategory(item.category) })),
    profiles: data.profiles.map((profile) => {
      const values = new Set(profile.criticalities.map(normalizeProductCriticality));
      if (profile.id === 'standard') values.add('Business-Operational');
      return { ...profile, criticalities: productCriticalities.filter((value) => values.has(value)) };
    }),
  };
}

function ensureCustomInfrastructureExample(data: AtlasState, defaults: AtlasState): AtlasState {
  const componentId = 'checkout-runtime-config';
  if (data.components.some((component) => component.id === componentId)) return data;
  const component = defaults.components.find((item) => item.id === componentId);
  if (!component) return data;
  return {
    ...data,
    components: [...data.components, component],
    products: data.products.map((product) => product.id === 'checkout' && !product.componentIds.includes(componentId) ? { ...product, componentIds: [...product.componentIds, componentId] } : product),
    topologyNodes: [...data.topologyNodes, ...defaults.topologyNodes.filter((node) => node.id === componentId && !data.topologyNodes.some((existing) => existing.id === node.id))],
    topologyEdges: [...data.topologyEdges, ...defaults.topologyEdges.filter((edge) => edge.targetId === componentId && !data.topologyEdges.some((existing) => existing.id === edge.id))],
    coverage: [...data.coverage, ...defaults.coverage.filter((evaluation) => evaluation.componentId === componentId && !data.coverage.some((existing) => existing.id === evaluation.id))],
  };
}

function SourcePill({ source, confidence, state }: { source: string; confidence: number; state: string }) {
  return <span className={`source-pill ${state.toLowerCase()}`}><CircleDot size={9} />{source} · {confidence}% · {state}</span>;
}

function SeverityBadge({ value }: { value: FindingSeverity | Product['criticality'] }) {
  return <span className={`severity-badge ${value.toLowerCase()}`}>{value}</span>;
}

function StateBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`state-badge ${tone}`}>{children}</span>;
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: LucideIcon; title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon size={22} /></span><strong>{title}</strong><p>{copy}</p>{action}</div>;
}

const navigationEvent = 'atlas:navigate';

export function AtlasApp() {
  const [route, setRoute] = useState<AtlasRoute>({ kind: 'overview' });
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(parseRoute(window.location.pathname));
      setRouteReady(true);
    };
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener(navigationEvent, syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener(navigationEvent, syncRoute);
    };
  }, []);

  function navigate(next: AtlasRoute) {
    const path = serializeRoute(next);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setRoute(next);
    window.dispatchEvent(new Event(navigationEvent));
  }

  if (!routeReady) return <div className="atlas-app final-app" aria-busy="true" />;
  return <InventoryProvider><InventoryApp route={route} navigate={navigate} /></InventoryProvider>;
}

export function DemoAtlasApp() {
  const [data, setData] = useState<AtlasState>(() => cloneDemoState());
  const dataRef = useRef(data);
  const locale = appLocale();
  const [hydrated, setHydrated] = useState(false);
  const routeReady = useRef(false);
  const [view, setView] = useState<ViewId>('overview');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productTab, setProductTab] = useState<ProductTab>('overview');
  const [componentTab, setComponentTab] = useState<ComponentTab>('summary');
  const [selectedCoverageId, setSelectedCoverageId] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItemRef[]>(defaultRecentItems);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profiles');
  const [modal, setModal] = useState<ModalKind>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [exceptionFindingId, setExceptionFindingId] = useState<string | null>(null);
  const [threatTarget, setThreatTarget] = useState<{ type: 'Node' | 'Edge'; id: string } | null>(null);
  const [topologyList, setTopologyList] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<string>('');
  const [reportUploadTarget, setReportUploadTarget] = useState<ReportUploadTarget | null>(null);
  const [createInitialKind, setCreateInitialKind] = useState('Component');
  const [createInfrastructureTemplateId, setCreateInfrastructureTemplateId] = useState<string | null>(null);
  const [createProductId, setCreateProductId] = useState<string | null>(null);
  const [editingInfrastructureTemplateId, setEditingInfrastructureTemplateId] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  function applyRoute(route: AtlasRoute, routeData = dataRef.current) {
    const productForKey = (productKey: string) => routeData.products.find((item) => item.key.toLowerCase() === productKey.toLowerCase());
    setCreatingProduct(false);
    setSelectedProductId(null);
    setSelectedComponentId(null);
    setSelectedCoverageId(null);
    setSelectedTeamId(null);
    setDrawer(null);
    setEditingInfrastructureTemplateId(null);
    setMobileOpen(false);
    if (route.kind === 'overview') return setView('overview');
    if (route.kind === 'workspaces') return setView('overview');
    if (route.kind === 'products') return setView('products');
    if (route.kind === 'product-create') { setView('products'); setCreatingProduct(true); return; }
    if (route.kind === 'templates') return setView('infrastructure');
    if (route.kind === 'teams') return setView('teams');
    if (route.kind === 'team') { setView('teams'); setSelectedTeamId(routeData.teams.find((item) => item.id === route.teamId)?.id ?? null); return; }
    if (route.kind === 'settings') return setView('settings');
    const product = productForKey(route.productKey);
    if (!product) return setView('products');
    setView('products');
    setSelectedProductId(product.id);
    if (route.kind === 'product') { setProductTab(route.tab ?? 'overview'); return; }
    const component = routeData.components.find((item) => item.id === route.componentId && item.productIds.includes(product.id));
    if (!component) return;
    setSelectedComponentId(component.id);
    setComponentTab(route.kind === 'component' ? route.tab === 'security' ? 'checks' : 'summary' : 'checks');
    if (route.kind === 'component-check') setSelectedCoverageId(routeData.coverage.find((item) => item.componentId === component.id && item.control === route.checkType)?.id ?? null);
  }

  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const product = (id: string | undefined) => data.products.find((item) => item.id === id);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { data?: AtlasState; recentItems?: RecentItemRef[]; recentProductIds?: string[]; recentComponentIds?: string[] };
          if (isAtlasState(parsed.data)) {
            const defaults = cloneDemoState();
            const defaultCatalog = defaults.infrastructureCatalog;
            const catalogDefaults = new Map(defaultCatalog.map((item) => [item.id, item]));
            const migrated = ensureCustomInfrastructureExample(migrateStoredData(parsed.data), defaults);
            const storedIds = new Set(migrated.infrastructureCatalog.map((item) => item.id));
            setData({
              ...migrated,
              infrastructureCatalog: [
                ...migrated.infrastructureCatalog.map((item) => ({ ...item, logoUrl: item.logoUrl ?? catalogDefaults.get(item.id)?.logoUrl })),
                ...defaultCatalog.filter((item) => !storedIds.has(item.id)),
              ],
            });
          }
          if (Array.isArray(parsed.recentItems)) {
            const validItems = parsed.recentItems.filter((item) => item && (item.kind === 'product' || item.kind === 'component') && typeof item.id === 'string');
            if (validItems.length) setRecentItems(validItems.slice(0, 6));
          } else {
            const migratedItems: RecentItemRef[] = [];
            for (let index = 0; index < 4; index += 1) {
              const componentId = parsed.recentComponentIds?.[index];
              const productId = parsed.recentProductIds?.[index];
              if (componentId) migratedItems.push({ kind: 'component', id: componentId });
              if (productId) migratedItems.push({ kind: 'product', id: productId });
            }
            if (migratedItems.length) setRecentItems(migratedItems.slice(0, 6));
          }
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, recentItems }));
  }, [data, hydrated, recentItems]);

  useEffect(() => {
    if (!hydrated) return;
    // Restore after localStorage hydration so persisted entities can resolve before the first route render.
    const restoreLocation = () => applyRoute(parseRoute(window.location.pathname));
    restoreLocation();
    routeReady.current = true;
    window.addEventListener('popstate', restoreLocation);
    return () => window.removeEventListener('popstate', restoreLocation);
  }, [hydrated]);

  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!highlightedProductId) return;
    const timer = window.setTimeout(() => setHighlightedProductId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightedProductId]);

  useEffect(() => {
    if (!mobileOpen) return;
    const appFrame = document.querySelector<HTMLElement>('.atlas-app > .app-frame');
    const mobileMenuTrigger = mobileMenuTriggerRef.current;
    appFrame?.setAttribute('inert', '');
    const firstNavigationItem = document.querySelector<HTMLElement>('#mobile-navigation .main-nav button');
    firstNavigationItem?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      appFrame?.removeAttribute('inert');
      mobileMenuTrigger?.focus();
    };
  }, [mobileOpen]);

  function navigate(next: ViewId) {
    setView(next);
    setCreatingProduct(false);
    setSelectedProductId(null);
    setSelectedComponentId(null);
    setSelectedCoverageId(null);
    setSelectedTeamId(null);
    setDrawer(null);
    setEditingInfrastructureTemplateId(null);
    setMobileOpen(false);
  }

  function openWorkspaces() {
    const path = serializeRoute({ kind: 'workspaces' });
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setMobileOpen(false);
    window.dispatchEvent(new Event(navigationEvent));
  }

  function openProduct(id: string, tab: ProductTab = 'overview') {
    setView('products');
    setCreatingProduct(false);
    setSelectedProductId(id);
    setSelectedComponentId(null);
    setSelectedCoverageId(null);
    setSelectedTeamId(null);
    setProductTab(tab);
    touchRecent({ kind: 'product', id });
    setDrawer(null);
  }

  function openComponent(id: string) {
    setSelectedComponentId(id);
    setSelectedCoverageId(null);
    setComponentTab('summary');
    touchRecent({ kind: 'component', id });
    setDrawer(null);
  }

  function openRecentComponent(id: string) {
    const target = data.components.find((item) => item.id === id);
    const productId = target?.productIds[0];
    if (!productId) return;
    setView('products');
    setCreatingProduct(false);
    setSelectedProductId(productId);
    setSelectedComponentId(id);
    setSelectedCoverageId(null);
    setSelectedTeamId(null);
    setComponentTab('summary');
    touchRecent({ kind: 'component', id });
    setDrawer(null);
  }

  function touchRecent(item: RecentItemRef) {
    setRecentItems((current) => [item, ...current.filter((entry) => entry.kind !== item.kind || entry.id !== item.id)].slice(0, 6));
  }

  function openTeam(id: string) {
    setView('teams');
    setSelectedProductId(null);
    setSelectedComponentId(null);
    setSelectedCoverageId(null);
    setSelectedTeamId(id);
    setDrawer(null);
  }

  function openCreate(kind = 'Product', infrastructureTemplateId?: string, productId?: string) {
    if (kind === 'Product') {
      setView('products');
      setCreatingProduct(true);
      setSelectedProductId(null);
      setSelectedComponentId(null);
      setSelectedCoverageId(null);
      setSelectedTeamId(null);
      setDrawer(null);
      return;
    }
    setCreateInitialKind(kind);
    setCreateInfrastructureTemplateId(infrastructureTemplateId ?? null);
    setCreateProductId(productId ?? null);
    setModal('create');
  }

  function openReportUpload(componentId?: string, control?: ReportControl) {
    setReportUploadTarget({ componentId, control });
    setDrawer(null);
    setModal('upload');
  }

  function resetDemo() {
    setData(cloneDemoState());
    setView('overview');
    setSelectedProductId(null);
    setSelectedComponentId(null);
    setSelectedCoverageId(null);
    setSelectedTeamId(null);
    setCreatingProduct(false);
    setProductTab('overview');
    setComponentTab('summary');
    setRecentItems(defaultRecentItems);
    setDrawer(null);
    setModal(null);
    setReportUploadTarget(null);
    setEditingInfrastructureTemplateId(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setToast('Demo workspace reset');
  }

  function createProductRecord(nextProduct: Product) {
    setData((current) => ({
      ...current,
      products: [...current.products, nextProduct],
      threatModels: [...current.threatModels, { id: `tm-${nextProduct.id}`, productId: nextProduct.id, status: 'Draft', updatedAt: new Date().toISOString() }],
    }));
    setCreatingProduct(false);
    setSelectedProductId(null);
    setSelectedComponentId(null);
    setProductTab('overview');
    setHighlightedProductId(nextProduct.id);
    touchRecent({ kind: 'product', id: nextProduct.id });
    setToast(tr('Продукт создан', 'Product created'));
  }

  function updateFindingStatus(id: string, status: FindingStatus) {
    setData((current) => ({ ...current, findings: current.findings.map((item) => item.id === id ? { ...item, status } : item) }));
    setToast(tr(`Статус изменён: ${status}`, `Status changed: ${status}`));
  }

  function createException(exception: RiskException) {
    setData((current) => ({ ...current, exceptions: [...current.exceptions, exception] }));
    setModal(null);
    setExceptionFindingId(null);
    setToast(tr('Исключение создано и будет автоматически пересмотрено', 'Exception created and scheduled for review'));
  }

  function connectIntegration(id: string) {
    setData((current) => ({
      ...current,
      integrations: current.integrations.map((item) => item.id === id ? { ...item, status: 'Connected', lastSync: new Date().toISOString() } : item),
    }));
    setToast(tr('Демо-подключение настроено', 'Demo connection configured'));
  }

  function addRelation(edge: TopologyEdge) {
    setData((current) => ({
      ...current,
      topologyEdges: [...current.topologyEdges, edge],
      threatModels: current.threatModels.map((model) => model.productId === edge.productId ? { ...model, status: 'Needs review' } : model),
    }));
    setModal(null);
    setToast(tr('Связь добавлена; модель угроз требует пересмотра', 'Relation added; threat model now needs review'));
  }

  function addThreat(threat: Threat) {
    setData((current) => ({
      ...current,
      threats: [...current.threats, threat],
      threatModels: current.threatModels.map((model) => model.productId === threat.productId ? { ...model, status: 'Needs review' } : model),
    }));
    setModal(null);
    setThreatTarget(null);
    setToast(tr('Угроза добавлена в модель', 'Threat added to the model'));
  }

  function setThreatStatus(id: string, status: Threat['status']) {
    setData((current) => ({ ...current, threats: current.threats.map((item) => item.id === id ? { ...item, status } : item) }));
    setToast(tr('Статус угрозы обновлён', 'Threat status updated'));
  }

  function setModelStatus(productId: string, status: ThreatModelStatus) {
    if (status === 'Approved' && data.threats.some((item) => item.productId === productId && item.status !== 'Mitigated')) {
      setToast(tr('Сначала завершите все mitigations', 'Complete every mitigation before approval'));
      return;
    }
    setData((current) => ({ ...current, threatModels: current.threatModels.map((item) => item.productId === productId ? { ...item, status, updatedAt: new Date().toISOString(), approvedBy: status === 'Approved' ? 'Alex Morgan' : item.approvedBy } : item) }));
    setToast(tr('Статус модели обновлён', 'Threat model status updated'));
  }

  function importReport({ productId, componentId, control, reportType, externalRunId }: { productId: string; componentId: string; control: ReportControl; reportType: string; externalRunId: string }) {
    const targetProduct = product(productId) ?? data.products[0];
    const targetComponent = data.components.find((item) => item.id === componentId) ?? data.components.find((item) => targetProduct.componentIds.includes(item.id));
    if (!targetComponent) return;
    const owner = targetComponent.ownerTeamId;
    const id = `IMP-${String(Date.now()).slice(-5)}`;
    const reportId = externalRunId.trim() || `upload-${id}`;
    const importedAt = new Date().toISOString();
    const imported: Finding = {
      id, source: 'Import', confidence: 88, state: 'Suggested',
      title: { ru: `Импортированная находка из ${reportType}`, en: `Imported finding from ${reportType}` },
      description: { ru: 'Результат добавлен из загруженного отчёта и ожидает подтверждения.', en: 'The result was added from an uploaded report and is awaiting confirmation.' },
      severity: 'High', category: control, status: 'Needs triage', productIds: targetComponent.productIds,
      componentId: targetComponent.id, ownerTeamId: owner, assignee: 'Unassigned', contexts: ['Imported', 'Suggested'], due: '2026-09-01',
      remediation: { ru: 'Проверить evidence и подтвердить корректный remediation.', en: 'Review the evidence and confirm the appropriate remediation.' },
      occurrences: [{ id: `occ-${id}`, scanId: reportId, source: reportType, externalId: reportId, fingerprint: `${reportType.toLowerCase()}:${targetComponent.id}:${id}`, location: 'uploaded-report:1', revision: 'external', firstSeen: importedAt, lastSeen: importedAt }],
    };
    setData((current) => ({
      ...current,
      findings: [imported, ...current.findings],
      scanReports: [{ id: reportId, componentId: targetComponent.id, control, tool: reportType, status: 'Completed with findings', startedAt: importedAt, finishedAt: importedAt, revision: 'external', findingIds: [id], source: 'Import', confidence: 88, state: 'Suggested' }, ...current.scanReports],
      coverage: current.coverage.map((evaluation) => evaluation.componentId === targetComponent.id && evaluation.control === control ? { ...evaluation, status: 'Healthy', tool: reportType, lastRun: importedAt, evidence: `Imported report ${reportId}` } : evaluation),
    }));
    setToast(tr('Отчёт обработан: 1 новая, 11 обновлено, 8 без изменений', 'Report processed: 1 new, 11 updated, 8 unchanged'));
  }

  const activeProduct = selectedProductId ? product(selectedProductId) : undefined;
  const activeComponent = selectedComponentId ? data.components.find((item) => item.id === selectedComponentId) : undefined;
  const activeTeam = selectedTeamId ? data.teams.find((item) => item.id === selectedTeamId) : undefined;
  const activeFinding = drawer?.kind === 'finding' ? data.findings.find((item) => item.id === drawer.id) : undefined;
  const activeCoveragePage = selectedCoverageId ? data.coverage.find((item) => item.id === selectedCoverageId) : undefined;
  const activeNode = drawer?.kind === 'topology' && drawer.topologyKind === 'node' ? data.topologyNodes.find((item) => item.id === drawer.id) : undefined;
  const activeEdge = drawer?.kind === 'topology' && drawer.topologyKind === 'edge' ? data.topologyEdges.find((item) => item.id === drawer.id) : undefined;
  const editingInfrastructureTemplate = editingInfrastructureTemplateId ? data.infrastructureCatalog.find((item) => item.id === editingInfrastructureTemplateId) : undefined;

  const currentTitle = creatingProduct
    ? tr('Создать продукт', 'Create product')
    : activeCoveragePage ? `${activeCoveragePage.control} reports` : activeComponent?.name ?? activeProduct?.name ?? activeTeam?.name ?? navigation.find((item) => item.id === view)?.[locale] ?? (locale === 'ru' ? 'Настройки' : 'Settings');
  const currentRoute: AtlasRoute = creatingProduct ? { kind: 'product-create' }
    : view === 'overview' ? { kind: 'overview' }
      : view === 'infrastructure' ? { kind: 'templates' }
        : view === 'teams' ? activeTeam ? { kind: 'team', teamId: activeTeam.id } : { kind: 'teams' }
          : view === 'settings' ? { kind: 'settings' }
            : activeProduct && activeComponent && activeCoveragePage ? { kind: 'component-check', productKey: activeProduct.key, componentId: activeComponent.id, checkType: activeCoveragePage.control }
              : activeProduct && activeComponent ? { kind: 'component', productKey: activeProduct.key, componentId: activeComponent.id, tab: componentTab === 'checks' ? 'security' : undefined }
                : activeProduct ? { kind: 'product', productKey: activeProduct.key, tab: productTab === 'overview' ? undefined : productTab }
                  : { kind: 'products' };
  const currentPath = serializeRoute(currentRoute);
  const surfaceKey = [view, creatingProduct ? 'create' : '', selectedProductId, selectedComponentId, selectedCoverageId, selectedTeamId, productTab, componentTab, settingsTab]
    .filter(Boolean)
    .join(':');

  useEffect(() => {
    document.title = `${currentTitle} · Alpa`;
    if (routeReady.current && window.location.pathname !== currentPath) {
      window.history.pushState({}, '', currentPath);
      window.dispatchEvent(new Event(navigationEvent));
    }
  }, [currentPath, currentTitle]);

  return (
    <div className="atlas-app final-app">
      <aside id="mobile-navigation" className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label={tr('Навигация рабочей области', 'Workspace navigation')}>
        <div className="workspace-switcher sidebar-workspace" aria-label={tr('Рабочая область', 'Workspace')}>
          <span><small>Workspace</small><strong>Acme Global Commerce and Payments</strong></span>
        </div>
        <nav className="main-nav" aria-label={tr('Главная навигация', 'Primary navigation')}>
          {navigation.flatMap(({ id, icon: Icon, ru, en }, index) => [
            <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined}>
              <Icon size={19} strokeWidth={1.9} /><span>{tr(ru, en)}</span>
            </button>,
            ...(index === 0 ? [<button key="workspaces" type="button" onClick={openWorkspaces}><Boxes size={19} strokeWidth={1.9} /><span>Workspace</span></button>] : []),
          ])}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className={view === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings2 size={19} strokeWidth={1.9} /><span>{tr('Настройки', 'Settings')}</span></button>
          <div className="user-card"><span>AM</span><div><strong>Alex Morgan</strong><small>Application Security</small></div></div>
        </div>
      </aside>
      {mobileOpen ? <button className="mobile-overlay" type="button" onClick={() => setMobileOpen(false)} aria-label={tr('Закрыть меню', 'Close menu')} /> : null}

      <div className="app-frame">
        <header className="topbar">
          <div className="scope">
            <button ref={mobileMenuTriggerRef} className="mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label={tr('Открыть меню', 'Open menu')} aria-expanded={mobileOpen} aria-controls="mobile-navigation"><Menu size={18} /></button>
            <span>Acme Global Commerce and Payments</span><ChevronRight className="scope-separator" size={13} aria-hidden="true" /><strong>{currentTitle}</strong>
          </div>
          <div className="top-actions"><div className="profile-identity" aria-label="Alex Morgan, Application Security">AM</div></div>
        </header>

        <main className="content final-content">
          <div className="surface-transition" key={surfaceKey}>
            {view === 'overview' ? <OverviewView locale={locale} data={data} recentItems={recentItems} onOpenProduct={openProduct} onOpenComponent={openRecentComponent} /> : null}
            {view === 'products' ? creatingProduct ? <ProductCreatePage locale={locale} data={data} onCancel={() => setCreatingProduct(false)} onCreate={createProductRecord} /> : activeProduct ? (
              activeComponent ? activeCoveragePage ? <ComponentReportsPage locale={locale} evaluation={activeCoveragePage} data={data} onBack={() => { setSelectedCoverageId(null); setComponentTab('checks'); }} onUpload={() => activeCoveragePage.control !== 'Threat Model' && openReportUpload(activeComponent.id, activeCoveragePage.control)} onOpenFinding={(id) => setDrawer({ kind: 'finding', id })} /> : <ComponentWorkspace locale={locale} data={data} product={activeProduct} component={activeComponent} tab={componentTab} setTab={setComponentTab} onBack={() => { setSelectedComponentId(null); setSelectedCoverageId(null); }} onOpenCoverage={setSelectedCoverageId} onUploadReport={(control) => openReportUpload(activeComponent.id, control)} /> : <ProductWorkspace locale={locale} data={data} product={activeProduct} tab={productTab} setTab={setProductTab} onBack={() => setSelectedProductId(null)} onOpenComponent={openComponent} onOpenTeam={openTeam} onCreateComponent={() => openCreate('Component', undefined, activeProduct.id)} onSelectTopology={(kind, id) => setDrawer({ kind: 'topology', id, topologyKind: kind })} topologyList={topologyList} onToggleTopology={() => setTopologyList((value) => !value)} onAddRelation={() => setModal('relation')} onAddThreat={(target) => { setThreatTarget(target); setModal('threat'); }} onThreatStatus={setThreatStatus} onModelStatus={setModelStatus} />
            ) : <ProductsView locale={locale} data={data} highlightedProductId={highlightedProductId} onOpen={openProduct} onCreate={() => openCreate('Product')} /> : null}
            {view === 'infrastructure' ? <InfrastructureCatalogView locale={locale} data={data} onCreateTemplate={() => openCreate('Infrastructure template')} onEditTemplate={setEditingInfrastructureTemplateId} /> : null}
            {view === 'teams' ? activeTeam ? <TeamWorkspace locale={locale} data={data} team={activeTeam} onBack={() => setSelectedTeamId(null)} onOpenProduct={openProduct} /> : <TeamsView locale={locale} data={data} onOpen={openTeam} onCreate={() => openCreate('Team')} /> : null}
            {view === 'settings' ? <SettingsView locale={locale} data={data} tab={settingsTab} setTab={setSettingsTab} onConnect={connectIntegration} onUpload={() => openReportUpload()} onReset={resetDemo} /> : null}
          </div>
        </main>
      </div>

      {activeFinding ? <FindingDrawer locale={locale} finding={activeFinding} data={data} onClose={() => setDrawer(null)} onStatus={(status) => updateFindingStatus(activeFinding.id, status)} onException={() => { setExceptionFindingId(activeFinding.id); setModal('exception'); }} /> : null}
      {activeNode || activeEdge ? <TopologyDrawer locale={locale} node={activeNode} edge={activeEdge} data={data} onClose={() => setDrawer(null)} onAddThreat={(target) => { setThreatTarget(target); setModal('threat'); }} /> : null}

      {modal === 'create' ? <CreateModal locale={locale} data={data} initialKind={createInitialKind} initialInfrastructureTemplateId={createInfrastructureTemplateId} initialProductId={createProductId} onClose={() => setModal(null)} onCreate={(next) => { setData(next); setModal(null); setCreateInfrastructureTemplateId(null); setCreateProductId(null); setToast(tr('Объект создан вручную', 'Object created manually')); }} /> : null}
      {modal === 'upload' ? <UploadModal locale={locale} data={data} target={reportUploadTarget ?? {}} onClose={() => { setModal(null); setReportUploadTarget(null); }} onImport={(payload) => { importReport(payload); setModal(null); setReportUploadTarget(null); }} /> : null}
      {modal === 'exception' && exceptionFindingId ? <ExceptionModal locale={locale} findingId={exceptionFindingId} onClose={() => { setModal(null); setExceptionFindingId(null); }} onCreate={createException} /> : null}
      {modal === 'relation' ? <RelationModal locale={locale} data={data} productId={selectedProductId ?? 'checkout'} onClose={() => setModal(null)} onCreate={addRelation} /> : null}
      {modal === 'threat' ? <ThreatModal locale={locale} data={data} productId={selectedProductId ?? 'checkout'} target={threatTarget} onClose={() => { setModal(null); setThreatTarget(null); }} onCreate={addThreat} /> : null}
      {editingInfrastructureTemplate ? <InfrastructureTemplateEditModal locale={locale} item={editingInfrastructureTemplate} onClose={() => setEditingInfrastructureTemplateId(null)} onSave={(updated) => { setData((current) => ({ ...current, infrastructureCatalog: current.infrastructureCatalog.map((item) => item.id === updated.id ? updated : item) })); setEditingInfrastructureTemplateId(null); setToast('Template updated'); }} /> : null}

      {toast ? <div className="toast" role="status"><span><Check size={14} /></span><div><strong>{tr('Готово', 'Done')}</strong><small>{toast}</small></div><button type="button" onClick={() => setToast('')} aria-label={tr('Закрыть', 'Dismiss')}><X size={13} /></button></div> : null}
    </div>
  );
}

type ViewProps = { locale: Locale; data: AtlasState };

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="page-actions">{actions}</div> : null}</header>;
}

function ComponentAvatar({ component, data }: { component: Component; data: AtlasState }) {
  const template = component.infrastructureTemplateId ? data.infrastructureCatalog.find((item) => item.id === component.infrastructureTemplateId) : undefined;
  if (component.kind === 'Infrastructure Component' && template?.logoUrl) {
    return <span className="component-list-avatar template" aria-hidden="true"><span className="component-avatar-brandmark" style={{ backgroundImage: `url("${template.logoUrl}")` }} /></span>;
  }
  const Icon = component.kind === 'Backend Service' ? Server : component.kind === 'Frontend Service' ? LayoutGrid : Boxes;
  return <span className={`component-list-avatar ${slug(component.kind)}`} aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>;
}

function OverviewView({ locale, data, recentItems, onOpenProduct, onOpenComponent }: ViewProps & { recentItems: RecentItemRef[]; onOpenProduct: (id: string) => void; onOpenComponent: (id: string) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const recent = recentItems.flatMap<RecentItem>((reference) => {
    if (reference.kind === 'product') {
      const entity = data.products.find((item) => item.id === reference.id);
      return entity ? [{ kind: 'product' as const, entity }] : [];
    }
    const entity = data.components.find((item) => item.id === reference.id);
    return entity ? [{ kind: 'component' as const, entity }] : [];
  });
  return <div className="dashboard-shell">
    <PageHeader title={tr('Дашборд', 'Dashboard')} />
    <section className="dashboard-card dashboard-recent dashboard-recent-unified">
      <header><div><h2>{tr('Недавно посещённые', 'Recently visited')}</h2></div><span>{recent.length}</span></header>
      <div className="dashboard-timeline">
        {recent.map((item, index) => {
          const parentProduct = item.kind === 'component' ? data.products.find((product) => item.entity.productIds.includes(product.id)) : undefined;
          const metadata = item.kind === 'product' ? item.entity.key : parentProduct?.name ?? tr('Без продукта', 'No product');
          const typeLabel = item.kind === 'product' ? 'Product' : 'Component';
          return <button type="button" key={`${item.kind}-${item.entity.id}`} onClick={() => item.kind === 'product' ? onOpenProduct(item.entity.id) : onOpenComponent(item.entity.id)}><i className="timeline-dot" />{item.kind === 'product' ? <EntityAvatar className="product-avatar dashboard-product-avatar" seed={item.entity.id} name={item.entity.name} avatarUrl={item.entity.avatarUrl} /> : <ComponentAvatar component={item.entity} data={data} />}<span className="recent-product-copy"><small>{index === 0 ? tr('Последний просмотр', 'Last viewed') : tr('Ранее', 'Earlier')}</small><strong>{item.entity.name}</strong><span>{metadata} · {typeLabel}</span></span><ChevronRight size={16} /></button>;
        })}
      </div>
    </section>
  </div>;
}

function CoverageMatrix({ locale, data, compact = false, onOpen, onOpenProduct }: { locale: Locale; data: AtlasState; compact?: boolean; onOpen?: (id: string) => void; onOpenProduct?: (id: string) => void }) {
  return (
    <div className={`coverage-matrix ${compact ? 'compact' : ''}`}>
      <div className="coverage-head"><span>{locale === 'ru' ? 'Продукт' : 'Product'}</span>{controlTypes.map((control) => <span key={control}>{control === 'Threat Model' ? 'TM' : control === 'Secrets' ? 'SEC' : control}</span>)}</div>
      {data.products.map((product) => <div className="coverage-row" key={product.id}><button type="button" className="coverage-product" onClick={() => onOpenProduct?.(product.id)}>{product.name}</button>{controlTypes.map((control) => {
        const evaluation = data.coverage.find((item) => item.productId === product.id && item.control === control);
        return <button key={control} type="button" className={`coverage-cell ${slug(evaluation?.status ?? 'Unknown')}`} title={`${control}: ${evaluation?.status ?? 'Unknown'}`} onClick={() => evaluation && onOpen?.(evaluation.id)}><i /><span>{evaluation?.status}</span></button>;
      })}</div>)}
      {compact ? <div className="coverage-legend"><span><i className="healthy" />Healthy</span><span><i className="stale" />Stale</span><span><i className="gap" />Gap</span><span><i className="not-applicable" />N/A</span></div> : null}
    </div>
  );
}

function ProductsView({ locale, data, highlightedProductId, onOpen, onCreate }: ViewProps & { highlightedProductId: string | null; onOpen: (id: string) => void; onCreate: () => void }) {
  const [query, setQuery] = useState('');
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const visible = data.products.filter((item) => `${item.name} ${item.key}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="products-page"><PageHeader title={tr('Продукты', 'Products')} actions={<button className="button primary" type="button" onClick={onCreate}><Plus size={14} />{tr('Создать продукт', 'Create product')}</button>} /><section className="panel table-panel products-catalog"><div className="table-toolbar"><SearchField label={tr('Поиск продуктов', 'Search products')} value={query} onChange={setQuery} placeholder={tr('Поиск продуктов…', 'Search products…')} /><span className="table-count">{visible.length} {tr('продуктов', 'products')}</span></div>{visible.length ? <div className="table-scroll" tabIndex={0} aria-label={tr('Таблица продуктов; прокрутите по горизонтали для просмотра всех столбцов.', 'Products table; scroll horizontally to view all columns.')}><table className="data-table products-table"><thead><tr><th>{tr('Продукт', 'Product')}</th><th>{tr('Код', 'Code')}</th><th>{tr('Критичность', 'Criticality')}</th><th>{tr('Владелец', 'Owner')}</th><th>{tr('Компоненты', 'Components')}</th><th>{tr('Архитектура', 'Architecture')}</th><th aria-label={tr('Открыть продукт', 'Open product')} /></tr></thead><tbody>{visible.map((item) => <tr className={item.id === highlightedProductId ? 'newly-created recently-created' : undefined} key={item.id}><td><button className="table-link" type="button" onClick={() => onOpen(item.id)}><span className="entity-name"><span><strong>{item.name}</strong></span></span></button></td><td className="product-code-cell">{item.key}</td><td><SeverityBadge value={item.criticality} /></td><td>{data.teams.find((team) => team.id === item.ownerTeamId)?.name}</td><td>{data.components.filter((component) => component.productIds.includes(item.id)).length}</td><td>{data.topologyEdges.filter((edge) => edge.productId === item.id).length} flows</td><td><button className="table-row-action" type="button" onClick={() => onOpen(item.id)} aria-label={`${tr('Open', 'Open')} ${item.name}`}><ChevronRight size={15} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={Search} title={tr('Продукты не найдены', 'No products found')} copy={tr('Измените поисковый запрос или создайте продукт.', 'Adjust the search or create a product.')} />}</section></div>;
}

function ProductCreatePage({ locale, data, onCancel, onCreate }: ViewProps & { onCancel: () => void; onCreate: (product: Product) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const [draft, setDraft] = useState<ProductDraft>({ name: '', key: '', description: '', teamId: '', criticality: 'Business-Critical', exposure: 'Internal', productOwnerName: '', productOwnerEmail: '' });
  const [errors, setErrors] = useState<ProductDraftErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const teamRef = useRef<HTMLSelectElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [keyEdited, setKeyEdited] = useState(false);
  const normalizeKey = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
  const errorId = (field: keyof ProductDraftErrors) => `${formId}-${field}-error`;
  useEffect(() => {
    const firstError = (['name', 'key', 'teamId', 'productOwnerName', 'productOwnerEmail'] as const).find((field) => errors[field]);
    const errorRef = firstError === 'name' ? nameRef : firstError === 'key' ? keyRef : firstError === 'teamId' ? teamRef : firstError === 'productOwnerName' ? ownerRef : firstError === 'productOwnerEmail' ? emailRef : undefined;
    errorRef?.current?.focus();
  }, [errors]);

  function updateDraft(field: ProductDraftField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field as keyof ProductDraftErrors]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors: ProductDraftErrors = {};
    if (!draft.name.trim()) nextErrors.name = tr('Укажите название продукта.', 'Product name is required.');
    if (!draft.key.trim()) nextErrors.key = tr('Укажите ключ продукта.', 'Product key is required.');
    if (!draft.teamId) nextErrors.teamId = tr('Выберите ответственную команду.', 'Choose an owning team.');
    if (!draft.productOwnerName.trim()) nextErrors.productOwnerName = tr('Укажите Product Owner.', 'Product owner is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.productOwnerEmail.trim())) nextErrors.productOwnerEmail = tr('Укажите корректный email Product Owner.', 'Enter a valid product owner email.');
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    const id = `manual-${Date.now()}`;
    const description = draft.description.trim() || tr('Продукт создан вручную.', 'Manually created product.');
    window.setTimeout(() => onCreate({
      id,
      name: draft.name.trim(),
      key: normalizeKey(draft.key),
      description: { ru: description, en: description },
      criticality: normalizeProductCriticality(draft.criticality),
      lifecycle: 'Production',
      exposure: draft.exposure,
      ownerTeamId: draft.teamId,
      productOwnerName: draft.productOwnerName.trim(),
      productOwnerEmail: draft.productOwnerEmail.trim(),
      componentIds: [],
      source: 'Manual',
      confidence: 100,
      state: 'Confirmed',
    }), 0);
  }

  return <div className="product-create-page">
    <button className="back-link" type="button" onClick={onCancel}><ArrowLeft size={13} />{tr('Продукты', 'Products')}</button>
    <PageHeader title={tr('Создать продукт', 'Create product')} description={<><span>{tr('Продукты объединяют прикладные компоненты, ответственность, архитектуру и модели угроз.', 'Products bring together application components, ownership, architecture, and threat models.')}</span><em>{tr('Обязательные поля отмечены звёздочкой (*).', 'Required fields are marked with an asterisk (*).')}</em></>} />
    <div className="product-create-layout">
      <form id="create-product-form" className="product-create-form" noValidate onSubmit={submit}>
        <section className="product-form-section" aria-labelledby={`${formId}-basic`}>
          <header><h2 id={`${formId}-basic`}>{tr('Основная информация', 'Basic information')}</h2><p>{tr('Понятное имя помогает быстро найти продукт в общем каталоге.', 'A clear name makes the product easy to find in the catalog.')}</p></header><div className="create-fields"><label><FieldLabel help="The human-readable name shown across inventory and reports." required>{tr('Название продукта', 'Product name')}</FieldLabel><input ref={nameRef} name="name" required aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? errorId('name') : undefined} autoFocus value={draft.name} onChange={(event) => { const nextName = event.target.value; updateDraft('name', nextName); if (!keyEdited) updateDraft('key', normalizeKey(nextName)); }} placeholder={tr('Например, Checkout Platform', 'For example, Checkout Platform')} />{errors.name ? <small id={errorId('name')} className="field-error">{errors.name}</small> : null}</label><label><FieldLabel help="A short stable identifier used in tables, URLs, and integrations." required>{tr('Ключ', 'Key')}</FieldLabel><input ref={keyRef} name="key" required aria-required="true" aria-invalid={Boolean(errors.key)} aria-describedby={[`${formId}-key-help`, errors.key ? errorId('key') : ''].filter(Boolean).join(' ')} value={draft.key} onChange={(event) => { setKeyEdited(true); updateDraft('key', normalizeKey(event.target.value)); }} placeholder="CHECKOUT" /><small id={`${formId}-key-help`}>{tr('Короткий идентификатор для таблиц и интеграций', 'Short identifier for tables and integrations')}</small>{errors.key ? <small id={errorId('key')} className="field-error">{errors.key}</small> : null}</label><label className="full"><FieldLabel help="A brief explanation of what the product does and which business process it supports.">{tr('Описание', 'Description')}</FieldLabel><textarea name="description" rows={6} maxLength={500} value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} placeholder={tr('Что делает продукт и какой бизнес-процесс поддерживает?', 'What does the product do and which business process does it support?')} /></label></div>
        </section>
        <section className="product-form-section" aria-labelledby={`${formId}-ownership`}>
          <header><h2 id={`${formId}-ownership`}>{tr('Ответственность и контекст', 'Ownership and context')}</h2><p>{tr('Эти параметры определяют владельца и базовый контекст продукта.', 'These fields define ownership and the product’s basic context.')}</p></header><div className="create-fields ownership-fields"><label className="context-field"><FieldLabel help="The engineering team responsible for maintaining this product and its security posture." required>{tr('Ответственная команда', 'Owning team')}</FieldLabel><select ref={teamRef} name="teamId" required aria-required="true" aria-invalid={Boolean(errors.teamId)} aria-describedby={errors.teamId ? errorId('teamId') : undefined} value={draft.teamId} onChange={(event) => updateDraft('teamId', event.target.value)}><option value="">{tr('Выберите команду', 'Choose a team')}</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>{errors.teamId ? <small id={errorId('teamId')} className="field-error">{errors.teamId}</small> : null}</label><label className="context-field"><FieldLabel help="How severely the business is affected if this product becomes unavailable or compromised.">{tr('Критичность системы', 'System criticality')}</FieldLabel><select name="criticality" value={draft.criticality} onChange={(event) => updateDraft('criticality', event.target.value)}>{productCriticalities.map((criticality) => <option key={criticality}>{criticality}</option>)}</select></label><label className="context-field"><FieldLabel help="Whether the product is reachable only internally or directly from the internet.">{tr('Доступность', 'Exposure')}</FieldLabel><select name="exposure" value={draft.exposure} onChange={(event) => updateDraft('exposure', event.target.value)}><option>Internal</option><option>Internet</option></select></label><label className="owner-field"><FieldLabel help="The person accountable for product priorities and business decisions." required>Product Owner</FieldLabel><input ref={ownerRef} name="productOwnerName" required aria-required="true" aria-invalid={Boolean(errors.productOwnerName)} aria-describedby={errors.productOwnerName ? errorId('productOwnerName') : undefined} value={draft.productOwnerName} onChange={(event) => updateDraft('productOwnerName', event.target.value)} placeholder="Full name" />{errors.productOwnerName ? <small id={errorId('productOwnerName')} className="field-error">{errors.productOwnerName}</small> : null}</label><label className="owner-field"><FieldLabel help="The email used to contact the Product Owner about this product." required>Product Owner email</FieldLabel><input ref={emailRef} name="productOwnerEmail" type="email" required aria-required="true" aria-invalid={Boolean(errors.productOwnerEmail)} aria-describedby={errors.productOwnerEmail ? errorId('productOwnerEmail') : undefined} value={draft.productOwnerEmail} onChange={(event) => updateDraft('productOwnerEmail', event.target.value)} placeholder="owner@company.com" />{errors.productOwnerEmail ? <small id={errorId('productOwnerEmail')} className="field-error">{errors.productOwnerEmail}</small> : null}</label></div>
        </section>
        <footer className="product-create-actions"><button className="button primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}><Plus size={14} />{isSubmitting ? tr('Создание…', 'Creating product…') : tr('Создать продукт', 'Create product')}</button></footer>
      </form>
    </div>
  </div>;
}

function InfrastructureCatalogView({ locale, data, onCreateTemplate, onEditTemplate }: ViewProps & { onCreateTemplate: () => void; onEditTemplate: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | InfrastructureCategory>('All');
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const categoryTabs: Array<'All' | InfrastructureCategory> = ['All', ...infrastructureCategories.filter((category) => data.infrastructureCatalog.some((item) => item.category === category))];
  const normalizedQuery = query.trim().toLowerCase();
  const visible = data.infrastructureCatalog.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesQuery = `${item.name} ${item.description[locale]} ${item.componentKind} ${item.category}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return <>
    <PageHeader
      title="Components Templates"
      actions={<button className="button primary" type="button" onClick={onCreateTemplate}><Plus size={14} />{tr('Добавить шаблон', 'Add template')}</button>}
    />
    <section className="panel infrastructure-catalog">
      <div className="tabs infrastructure-tabs" role="tablist" aria-label={tr('Категория шаблона', 'Template category')}>
        {categoryTabs.map((category) => <button key={category} role="tab" type="button" aria-selected={categoryFilter === category} className={categoryFilter === category ? 'active' : ''} onClick={() => setCategoryFilter(category)}>{category === 'All' ? 'All' : infrastructureCategoryLabel(category, locale)}</button>)}
      </div>
      <div className="table-toolbar">
        <SearchField label={tr('Поиск в справочнике', 'Search catalog')} value={query} onChange={setQuery} placeholder={tr('Поиск по справочнику…', 'Search catalog…')} />
        <span className="table-count">{visible.length} {tr('шаблонов', 'templates')}</span>
      </div>
      <div className="infrastructure-list">
        {visible.map((item) => {
          return <article className="infrastructure-row" key={item.id}>
            <span className="infrastructure-logo">{item.logoUrl ? <span className="infrastructure-brandmark" role="img" aria-label={`${item.name} logo`} style={{ backgroundImage: `url("${item.logoUrl}")` }} /> : <Database size={20} />}</span>
            <div className="infrastructure-copy"><span><strong>{item.name}</strong>{item.custom ? <StateBadge tone="in-review">{tr('Свой шаблон', 'Custom template')}</StateBadge> : null}</span><p>{item.description[locale]}</p></div>
            <span className="infrastructure-category"><small>{tr('Категория', 'Category')}</small><strong>{infrastructureCategoryLabel(item.category, locale)}</strong></span>
            <span className="infrastructure-category infrastructure-component-type"><small>{tr('Тип компонента', 'Component type')}</small><strong>{item.componentKind}</strong></span>
            <button className="infrastructure-edit" type="button" onClick={() => onEditTemplate(item.id)} aria-label={`${tr('Редактировать', 'Edit')} ${item.name}`}><Pencil size={13} />{tr('Редактировать', 'Edit')}</button>
          </article>;
        })}
      </div>
      {!visible.length ? <EmptyState icon={Search} title={tr('Шаблоны не найдены', 'No templates found')} copy={tr('Измените поисковый запрос или добавьте новый шаблон.', 'Adjust your search or add a new template.')} /> : null}
    </section>
  </>;
}

function ProductWorkspace({ locale, data, product, tab, setTab, onBack, onOpenComponent, onOpenTeam, onCreateComponent, onSelectTopology, topologyList, onToggleTopology, onAddRelation, onAddThreat, onThreatStatus, onModelStatus }: ViewProps & { product: Product; tab: ProductTab; setTab: (tab: ProductTab) => void; onBack: () => void; onOpenComponent: (id: string) => void; onOpenTeam: (id: string) => void; onCreateComponent: () => void; onSelectTopology: (kind: 'node' | 'edge', id: string) => void; topologyList: boolean; onToggleTopology: () => void; onAddRelation: () => void; onAddThreat: (target: { type: 'Node' | 'Edge'; id: string } | null) => void; onThreatStatus: (id: string, status: Threat['status']) => void; onModelStatus: (productId: string, status: ThreatModelStatus) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const productComponents = data.components.filter((item) => item.productIds.includes(product.id));
  const edges = data.topologyEdges.filter((item) => item.productId === product.id);
  const nodes = data.topologyNodes.filter((item) => item.productIds.includes(product.id));
  if (tab === 'architecture') return <>
    <button className="back-link" type="button" onClick={() => setTab('overview')}><ArrowLeft size={13} />{tr('Обзор продукта', 'Product overview')}</button>
    <PageHeader title={tr('Архитектура', 'Architecture')} description={product.name} />
    {nodes.length ? <TopologyMap locale={locale} nodes={nodes} edges={edges} teams={data.teams} components={data.components} resources={data.resources} listMode={topologyList} onToggleMode={onToggleTopology} onSelect={onSelectTopology} onAddRelation={onAddRelation} /> : <EmptyState icon={Network} title={tr('Архитектура пока не описана', 'Architecture has not been mapped yet')} copy={tr('Добавьте компоненты и связи вручную или импортируйте их из SCM и IaC.', 'Add components and relations manually or import them from SCM and IaC.')} action={<button className="button primary" type="button" onClick={onAddRelation}><Plus size={14} />{tr('Добавить связь', 'Add relation')}</button>} />}
  </>;
  if (tab === 'threat-model') return <>
    <button className="back-link" type="button" onClick={() => setTab('overview')}><ArrowLeft size={13} />{tr('Обзор продукта', 'Product overview')}</button>
    <ProductThreatWorkspace locale={locale} data={data} product={product} onAddThreat={() => onAddThreat(nodes[0] ? { type: 'Node', id: nodes[0].id } : null)} onThreatStatus={onThreatStatus} onModelStatus={onModelStatus} />
  </>;
  return (
    <>
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={13} />{tr('Все продукты', 'All products')}</button>
      <header className="product-header final-product-header">
        <div className="product-identity"><EntityAvatar className="product-avatar large" seed={product.id} name={product.name} avatarUrl={product.avatarUrl} /><div><div className="product-title-row"><h1>{product.name}</h1></div></div></div>
      </header>
      <ProductOverview locale={locale} data={data} product={product} components={productComponents} onOpen={onOpenComponent} onOpenTeam={onOpenTeam} onCreateComponent={onCreateComponent} onOpenSection={setTab} />
    </>
  );
}

function ProductOverview({ locale, data, product, components, onOpen, onOpenTeam, onCreateComponent, onOpenSection }: { locale: Locale; data: AtlasState; product: Product; components: Component[]; onOpen: (id: string) => void; onOpenTeam: (id: string) => void; onCreateComponent: () => void; onOpenSection: (tab: ProductTab) => void }) {
  const [typeFilter, setTypeFilter] = useState<'All' | ComponentKind>('All');
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const visible = typeFilter === 'All' ? components : components.filter((component) => component.kind === typeFilter);
  const filters: Array<{ value: 'All' | ComponentKind; ru: string; en: string }> = [
    { value: 'All', ru: 'Все', en: 'All' },
    { value: 'Backend Service', ru: 'Backend', en: 'Backend' },
    { value: 'Frontend Service', ru: 'Frontend', en: 'Frontend' },
    { value: 'Infrastructure Component', ru: 'Инфраструктура', en: 'Infrastructure' },
  ];
  const team = data.teams.find((item) => item.id === product.ownerTeamId);
  return <div className="product-overview">
    <section className="panel product-overview-context">
      <div className="product-summary-copy"><span className="eyebrow">{tr('О ПРОДУКТЕ', 'ABOUT THE PRODUCT')}</span><div className="product-card-meta product-metadata-grid"><span className="product-code"><small>{tr('Код продукта', 'Product code')}</small><strong>{product.key}</strong></span><span className="product-criticality"><small>{tr('Критичность системы', 'System criticality')}</small><SeverityBadge value={product.criticality} /></span></div><h2>{tr('Описание', 'Description')}</h2><p>{product.description[locale]}</p></div>
      <div className="product-ownership">
        <button className="responsible-team" type="button" onClick={() => team && onOpenTeam(team.id)} disabled={!team}><EntityAvatar className="team-avatar" seed={team?.id ?? 'unassigned-team'} name={team?.name ?? 'Unassigned'} avatarUrl={team?.avatarUrl} /><span><small>{tr('Ответственная команда', 'Responsible team')}</small><strong>{team?.name ?? tr('Не назначена', 'Unassigned')}</strong><em>{team?.lead ?? ''}</em></span><ChevronRight size={15} /></button>
        <a className="product-owner" href={product.productOwnerEmail ? `mailto:${product.productOwnerEmail}` : undefined} aria-disabled={!product.productOwnerEmail}><span className="product-owner-icon"><ContactRound size={19} strokeWidth={1.8} /></span><span><small>Product Owner</small><strong>{product.productOwnerName || 'Not assigned'}</strong><em>{product.productOwnerEmail || 'Email not set'}</em></span><ChevronRight size={15} /></a>
      </div>
    </section>
    <section className="product-destinations" aria-label={tr('Разделы продукта', 'Product destinations')}>
      <button type="button" className="product-destination" onClick={() => onOpenSection('architecture')}><span className="destination-icon architecture-mark"><Workflow size={23} strokeWidth={1.7} /></span><span><strong>{tr('Архитектура', 'Architecture')}</strong><em>{tr('Компоненты, ресурсы и data flows продукта', 'Components, resources, and product data flows')}</em></span><ChevronRight size={17} /></button>
      <button type="button" className="product-destination" onClick={() => onOpenSection('threat-model')}><span className="destination-icon threat-mark"><ShieldCheck size={23} strokeWidth={1.7} /></span><span><strong>{tr('Модель угроз', 'Threat model')}</strong><em>{tr('Угрозы, mitigations и review', 'Threats, mitigations, and review')}</em></span><ChevronRight size={17} /></button>
    </section>
    <section className="panel table-panel">
      <div className="component-filter-toolbar"><h2>{tr('Компоненты продукта', 'Product components')} <span>{visible.length}</span></h2><button className="button primary compact" type="button" onClick={onCreateComponent}><Plus size={13} />{tr('Добавить компонент', 'Add component')}</button></div>
      <div className="table-scroll"><table className="data-table component-table"><thead><tr><th>{tr('Компонент', 'Component')}</th><th><label className="column-filter"><span>{tr('Тип', 'Type')}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'All' | ComponentKind)} aria-label={tr('Фильтр по типу компонента', 'Filter by component type')}>{filters.map((filter) => <option key={filter.value} value={filter.value}>{tr(filter.ru, filter.en)}</option>)}</select></label></th><th>{tr('Расположение', 'Location')}</th><th>{tr('Владелец', 'Owner')}</th><th /></tr></thead><tbody>{visible.map((component) => {
        const binding = component.bindings.find((item) => item.role === 'Source');
        const repository = data.repositories.find((item) => item.id === binding?.repositoryId);
        const deployment = component.deployments.find((item) => item.environment === 'Production' && item.url) ?? component.deployments.find((item) => item.url) ?? component.deployments.find((item) => item.environment === 'Production') ?? component.deployments[0];
        const isInfrastructure = component.kind === 'Infrastructure Component';
        const locationHref = externalHttpUrl(isInfrastructure ? deployment?.url : repository?.url);
        const locationHost = locationHref ? new URL(locationHref).host : '';
        const locationLabel = isInfrastructure
          ? deployment && locationHost ? `${deployment.environment} · ${locationHost}` : '—'
          : repository && binding ? `${repository.name}${binding.path === '/' ? '' : binding.path}` : '—';
        return <tr key={component.id}><td><button className="table-link" type="button" onClick={() => onOpen(component.id)}><span className="entity-name"><ComponentAvatar component={component} data={data} /><span><strong>{component.name}</strong><small>{component.productIds.length > 1 ? tr('Общий компонент', 'Shared component') : component.description[locale]}</small></span></span></button></td><td><StateBadge tone={component.kind === 'Infrastructure Component' ? 'in-review' : 'confirmed'}>{component.kind}</StateBadge></td><td>{locationHref ? <a className="component-location-link" href={locationHref} target="_blank" rel="noreferrer" title={locationHref}>{locationLabel}<ExternalLink size={12} /></a> : <span className="location-empty">—</span>}</td><td>{data.teams.find((ownerTeam) => ownerTeam.id === component.ownerTeamId)?.name}</td><td><button className="table-row-action" type="button" onClick={() => onOpen(component.id)} aria-label={`${tr('Open', 'Open')} ${component.name}`}><ChevronRight size={15} /></button></td></tr>;
      })}</tbody></table></div>
      {!visible.length ? <EmptyState icon={Boxes} title={tr('Компонентов этого типа нет', 'No components of this type')} copy={tr('Выберите другой фильтр или создайте компонент.', 'Choose another filter or create a component.')} /> : null}
    </section>
  </div>;
}

function ComponentWorkspace({ locale, data, product, component, tab, setTab, onBack, onOpenCoverage, onUploadReport }: ViewProps & { product: Product; component: Component; tab: ComponentTab; setTab: (tab: ComponentTab) => void; onBack: () => void; onOpenCoverage: (id: string) => void; onUploadReport: (control?: ReportControl) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const evaluations = data.coverage.filter((item) => item.componentId === component.id && item.control !== 'Threat Model');
  const binding = component.bindings.find((item) => item.role === 'Source');
  const repository = data.repositories.find((item) => item.id === binding?.repositoryId);
  const template = data.infrastructureCatalog.find((item) => item.id === component.infrastructureTemplateId);
  const isInfrastructure = component.kind === 'Infrastructure Component';
  const deployment = component.deployments.find((item) => item.environment === 'Production' && item.url) ?? component.deployments.find((item) => item.url) ?? component.deployments.find((item) => item.environment === 'Production') ?? component.deployments[0];
  const repositoryUrl = externalHttpUrl(repository?.url);
  const deploymentUrl = externalHttpUrl(deployment?.url);
  const locationUrl = deploymentUrl ?? repositoryUrl;
  const locationLabel = deploymentUrl && deployment ? `${deployment.environment} · ${new URL(deploymentUrl).host}` : repository ? `${repository?.provider} · ${repository.name}` : '—';
  const owner = data.teams.find((team) => team.id === component.ownerTeamId);
  const tabs: Array<{ id: ComponentTab; ru: string; en: string }> = [{ id: 'summary', ru: 'Сводка', en: 'Summary' }, { id: 'checks', ru: 'Безопасность', en: 'Security' }];

  return <>
    <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={13} />{product.name}</button>
    <header className="product-header final-product-header component-header">
      <div className="product-identity"><ComponentAvatar component={component} data={data} /><div><div className="product-title-row"><h1>{component.name}</h1>{component.productIds.length > 1 ? <StateBadge tone="in-review">{tr('Общий компонент', 'Shared component')}</StateBadge> : null}</div><dl className="component-header-facts"><div><dt>{tr('Продукт', 'Product')}</dt><dd>{product.name}</dd></div><div><dt>{tr('Тип компонента', 'Component type')}</dt><dd>{component.kind}</dd></div><div><dt>API type</dt><dd>{component.apiType}</dd></div><div><dt>{tr('Владелец', 'Owner')}</dt><dd>{owner?.name ?? tr('Не назначен', 'Unassigned')}</dd></div><div><dt>{tr('Расположение', 'Location')}</dt><dd>{locationUrl ? <a className="component-location-link" href={locationUrl} target="_blank" rel="noreferrer">{locationLabel}<ExternalLink size={12} /></a> : '—'}</dd></div></dl></div></div>
    </header>
    <div className="tabs product-tabs" role="tablist">{tabs.map((item) => <button role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setTab(item.id)}>{tr(item.ru, item.en)}</button>)}</div>
    {tab === 'summary' ? <div className="component-summary-grid">
      <section className="panel component-summary-block component-description-block"><div className="block-heading"><span>{tr('Описание', 'Description')}</span></div><p>{component.description[locale]}</p></section>
      <section className="panel component-summary-block component-technologies-block"><div className="block-heading"><span>{tr('Основные технологии', 'Core technologies')}</span></div><div className="technology-list">{component.technologies.length ? component.technologies.map((technology) => <span key={technology}>{technology}</span>) : <small>{tr('Технологии не указаны', 'No technologies specified')}</small>}</div></section>
      <section className="panel component-summary-block component-general-block"><div className="panel-heading"><div><h2>{tr('Общая информация', 'General information')}</h2></div></div><dl className="component-facts"><div><dt>{tr('Продукты', 'Products')}</dt><dd>{component.productIds.map((id) => data.products.find((item) => item.id === id)?.name).filter(Boolean).join(', ')}</dd></div><div><dt>{tr('Владелец', 'Owner')}</dt><dd>{data.teams.find((team) => team.id === component.ownerTeamId)?.name}</dd></div><div><dt>{tr('Тип', 'Type')}</dt><dd>{component.kind}</dd></div><div><dt>API type</dt><dd>{component.apiType}</dd></div></dl></section>
      <section className="panel component-summary-block component-source-block"><div className="panel-heading"><div><h2>{isInfrastructure ? tr('Инфраструктурный контекст', 'Infrastructure context') : tr('Источник и развёртывание', 'Source and deployment')}</h2></div></div><dl className="component-facts">{isInfrastructure ? <><div><dt>{tr('Шаблон справочника', 'Catalog template')}</dt><dd>{template?.name ?? component.technologies[0] ?? '—'}</dd></div><div><dt>{tr('Тип шаблона', 'Template type')}</dt><dd>{template ? infrastructureCategoryLabel(template.category, locale) : '—'}</dd></div><div className="wide"><dt>{tr('Расположение', 'Location')}</dt><dd>{deploymentUrl && deployment ? <a className="component-location-link" href={deploymentUrl} target="_blank" rel="noreferrer">{deployment.environment} · {new URL(deploymentUrl).host}<ExternalLink size={12} /></a> : '—'}</dd></div></> : <><div><dt>{tr('Репозиторий', 'Repository')}</dt><dd>{repositoryUrl && repository ? <a className="component-location-link" href={repositoryUrl} target="_blank" rel="noreferrer">{repository.provider} · {repository.name}<ExternalLink size={12} /></a> : '—'}</dd></div><div><dt>{tr('Путь исходного кода', 'Source path')}</dt><dd>{binding ? `${binding.path} · ${binding.branch}` : '—'}</dd></div></>}<div className="wide"><dt>{tr('Развёртывания', 'Deployments')}</dt><dd>{component.deployments.length ? component.deployments.map((item) => `${item.environment} · ${item.version} · ${item.revision}`).join('; ') : tr('Нет активных развёртываний', 'No active deployments')}</dd></div></dl></section>
    </div> : null}
    {tab === 'checks' ? <ComponentSecurity locale={locale} data={data} productKey={product.key} evaluations={evaluations} onOpenCoverage={onOpenCoverage} onUploadReport={onUploadReport} /> : null}
  </>;
}

function ComponentCheckList({ locale, data, productKey, evaluations, onOpenCoverage, compact = false }: { locale: Locale; data: AtlasState; productKey: string; evaluations: CoverageEvaluation[]; onOpenCoverage: (id: string) => void; compact?: boolean }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  return <div className={`control-cards ${compact ? 'compact' : ''}`}>{evaluations.map((evaluation) => {
    const reports = data.scanReports.filter((report) => report.componentId === evaluation.componentId && report.control === evaluation.control);
    const findingCount = reports.reduce((sum, report) => sum + report.findingIds.length, 0);
    const href = `/products/${encodeURIComponent(productKey)}/components/${encodeURIComponent(evaluation.componentId ?? '')}/security/${encodeURIComponent(evaluation.control)}`;
    return <a href={href} key={evaluation.id} onClick={(event) => { event.preventDefault(); onOpenCoverage(evaluation.id); }}><span className={`control-status ${slug(evaluation.status)}`} aria-hidden="true"><i /></span><span className="control-check-copy"><strong>{evaluation.control}</strong><small>{tr('Status', 'Status')}: {statusCopy[evaluation.status][locale]} · {tr('Tool', 'Tool')}: {evaluation.tool ?? tr('Инструмент не выбран', 'No tool selected')}</small></span><span className="check-report-meta"><strong>{reports.length}</strong><small>{tr('reports', 'reports')} · {findingCount} {tr('findings', 'findings')}</small></span><span className="control-date"><small>{tr('Last report', 'Last report')}</small>{formatDate(evaluation.lastRun, locale)}</span><ChevronRight size={14} /></a>;
  })}</div>;
}

function ComponentSecurity({ locale, data, productKey, evaluations, onOpenCoverage, onUploadReport }: { locale: Locale; data: AtlasState; productKey: string; evaluations: CoverageEvaluation[]; onOpenCoverage: (id: string) => void; onUploadReport: (control?: ReportControl) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  return <section className="panel"><div className="panel-heading"><div><h2>{tr('Проверки безопасности компонента', 'Component security checks')}</h2></div><button className="button secondary compact" type="button" onClick={() => onUploadReport()}><Upload size={13} />{tr('Загрузить отчёт', 'Upload report')}</button></div><ComponentCheckList locale={locale} data={data} productKey={productKey} evaluations={evaluations} onOpenCoverage={onOpenCoverage} /></section>;
}

function ProductThreatWorkspace({ locale, data, product, onAddThreat, onThreatStatus, onModelStatus }: { locale: Locale; data: AtlasState; product: Product; onAddThreat: () => void; onThreatStatus: (id: string, status: Threat['status']) => void; onModelStatus: (productId: string, status: ThreatModelStatus) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const model = data.threatModels.find((item) => item.productId === product.id);
  const threats = data.threats.filter((item) => item.productId === product.id);
  const nodes = data.topologyNodes.filter((item) => item.productIds.includes(product.id));
  const edges = data.topologyEdges.filter((item) => item.productId === product.id);
  const unresolved = threats.filter((item) => item.status !== 'Mitigated');
  return <>
    <PageHeader eyebrow="THREAT MODEL" title={tr('Модель угроз продукта', 'Product threat model')} description={tr('Угрозы привязаны к узлам и data flows архитектуры продукта.', 'Threats are attached to product architecture nodes and data flows.')} actions={<><StateBadge tone={slug(model?.status ?? 'draft')}>{model?.status ?? 'Draft'}</StateBadge><button className="button secondary" type="button" onClick={() => onModelStatus(product.id, 'In review')}>{tr('На review', 'Send to review')}</button><button className="button primary" type="button" onClick={onAddThreat}><Plus size={14} />{tr('Добавить угрозу', 'Add threat')}</button></>} />
    <div className="threat-workspace">
      <section className="panel threat-scope">
        <div className="panel-heading"><div><h2>{tr('Scope и topology', 'Scope and topology')}</h2><p>{tr('Только архитектурный контекст этого продукта.', 'Only this product’s architecture context.')}</p></div><Network size={17} /></div>
        <div className="scope-mini-map"><div className="mini-flow">{nodes.length ? nodes.slice(0, 6).map((node, index) => <span key={node.id}>{index > 0 ? '→ ' : ''}{node.name}</span>) : <span>{tr('Topology пока пуста', 'Topology is empty')}</span>}</div><div className="scope-facts"><span><strong>{data.components.filter((item) => item.productIds.includes(product.id)).length}</strong><small>components</small></span><span><strong>{data.resources.filter((item) => item.productIds.includes(product.id)).length}</strong><small>resources</small></span><span><strong>{edges.length}</strong><small>flows</small></span><span><strong>{edges.filter((item) => item.crossesTrustBoundary).length}</strong><small>trust crossings</small></span></div></div>
      </section>
      <section className="panel threat-list-panel">
        <div className="panel-heading"><div><h2>{tr('Угрозы и mitigations', 'Threats and mitigations')}</h2><p>{tr('STRIDE используется как подсказка.', 'STRIDE is used as guidance.')}</p></div><button type="button" onClick={onAddThreat}><Plus size={13} />{tr('Новая угроза', 'New threat')}</button></div>
        {threats.length ? <div className="threat-list">{threats.map((threat) => <article key={threat.id}><div className="threat-head"><span className={`risk-matrix risk-${threat.likelihood * threat.impact}`}>{threat.likelihood * threat.impact}</span><div><span className="eyebrow">{threat.id} · {threat.stride}</span><h3>{threat.title[locale]}</h3></div><StateBadge tone={slug(threat.status)}>{threat.status}</StateBadge></div><p>{threat.scenario[locale]}</p><div className="mitigation"><ShieldCheck size={14} /><span><small>MITIGATION</small><strong>{threat.mitigation[locale]}</strong></span></div><footer><span>{data.teams.find((team) => team.id === threat.ownerTeamId)?.name}</span><span>{threat.targetType} · {threat.targetId}</span>{threat.status !== 'Mitigated' ? <button type="button" onClick={() => onThreatStatus(threat.id, 'Mitigated')}><CheckCircle2 size={13} />{tr('Завершить mitigation', 'Complete mitigation')}</button> : <span className="success-label"><Check size={12} />Mitigated</span>}</footer></article>)}</div> : <EmptyState icon={ShieldCheck} title={tr('Угроз пока нет', 'No threats yet')} copy={tr('Добавьте abuse-сценарий к узлу или data flow.', 'Add an abuse scenario to a node or data flow.')} />}
      </section>
      <aside className="panel review-panel">
        <div className="panel-heading"><div><h2>Review</h2></div></div>
        <div className="review-steps"><span className="done"><i><Check size={11} /></i><strong>{tr('Scope подтверждён', 'Scope confirmed')}</strong><small>{nodes.length} nodes · {edges.length} flows</small></span><span className="done"><i><Check size={11} /></i><strong>{tr('Угрозы рассмотрены', 'Threats reviewed')}</strong><small>{threats.length} scenarios</small></span><span className={unresolved.length ? 'current' : 'done'}><i>{unresolved.length ? '3' : <Check size={11} />}</i><strong>Mitigations</strong><small>{unresolved.length} open</small></span></div>
        <button className="button primary full" type="button" onClick={() => onModelStatus(product.id, 'Approved')} disabled={unresolved.length > 0}>{tr('Одобрить модель', 'Approve model')}</button>
        <p className="review-note">{tr('Изменение topology автоматически вернёт статус Needs review.', 'A topology change automatically returns the model to Needs review.')}</p>
      </aside>
    </div>
  </>;
}

export function CoverageView({ locale, data, onOpen }: ViewProps & { onOpen: (id: string) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const applicable = data.coverage.filter((item) => item.status !== 'Not applicable');
  const healthy = applicable.filter((item) => item.status === 'Healthy').length;
  const percent = Math.round(healthy / applicable.length * 100);
  return <><PageHeader eyebrow="CONTROL EVIDENCE" title={tr('Покрытие', 'Coverage')} description={tr('Отдельная оценка настроенности, успешности и свежести каждого AppSec-контроля.', 'A separate assessment of configuration, success, and freshness for every AppSec control.')} /><section className="coverage-overview"><div className="coverage-ring" style={{ '--coverage': `${percent * 3.6}deg` } as React.CSSProperties}><span><strong>{percent}%</strong><small>{tr('актуально', 'healthy')}</small></span></div><div><h2>{tr('Контроли работают, но есть пробелы', 'Controls are working, with a few gaps')}</h2><p>{tr('Отсутствие evidence никогда не считается успешной проверкой.', 'Missing evidence is never treated as a successful check.')}</p><div className="coverage-kpis"><span><i className="healthy" /><strong>{healthy}</strong><small>Healthy</small></span><span><i className="stale" /><strong>{data.coverage.filter((item) => item.status === 'Stale').length}</strong><small>Stale</small></span><span><i className="gap" /><strong>{data.coverage.filter((item) => item.status === 'Gap').length}</strong><small>Gap</small></span><span><i className="unknown" /><strong>{data.coverage.filter((item) => item.status === 'Unknown').length}</strong><small>Unknown</small></span></div></div></section><section className="panel coverage-full"><div className="panel-heading"><div><h2>{tr('Продукты × контроли', 'Products × controls')}</h2><p>{tr('Нажмите на ячейку, чтобы увидеть evidence или запустить demo scan.', 'Select a cell to inspect evidence or run a demo scan.')}</p></div><button type="button"><Filter size={13} />{tr('Фильтры', 'Filters')}</button></div><CoverageMatrix locale={locale} data={data} onOpen={onOpen} /></section><section className="coverage-notes"><div><span><ShieldCheck size={16} /></span><strong>{tr('Coverage ≠ отсутствие findings', 'Coverage ≠ no findings')}</strong><p>{tr('Успешный scan может обнаружить критический риск; это всё равно healthy coverage.', 'A successful scan may find critical risk and still represents healthy coverage.')}</p></div><div><span><Clock3 size={16} /></span><strong>{tr('Freshness зависит от профиля', 'Freshness follows the profile')}</strong><p>{tr('Для Mission-Critical продуктов Secrets проверяются ежедневно, Threat Model — раз в 30 дней.', 'Mission-Critical products require daily Secrets and 30-day Threat Model evidence.')}</p></div><div><span><CircleAlert size={16} /></span><strong>Unknown ≠ Pass</strong><p>{tr('Если branch, revision или target неизвестны, контроль остаётся Unknown.', 'If branch, revision, or target is unknown, the control remains Unknown.')}</p></div></section></>;
}

export function ThreatModelsView({ locale, data, productId, setProductId, onAddThreat, onThreatStatus, onModelStatus }: ViewProps & { productId: string | null; setProductId: (id: string | null) => void; onAddThreat: () => void; onThreatStatus: (id: string, status: Threat['status']) => void; onModelStatus: (productId: string, status: ThreatModelStatus) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const selected = productId ? data.products.find((item) => item.id === productId) : undefined;
  if (selected) return <><button className="back-link" type="button" onClick={() => setProductId(null)}><ArrowLeft size={13} />{tr('Все модели', 'All models')}</button><ThreatWorkspace locale={locale} data={data} product={selected} onAddThreat={onAddThreat} onThreatStatus={onThreatStatus} onModelStatus={onModelStatus} /></>;
  return <><PageHeader eyebrow="DESIGN-TIME SECURITY" title={tr('Модели угроз', 'Threat Models')} description={tr('Архитектура, abuse-сценарии и mitigations в контексте продукта.', 'Architecture, abuse scenarios, and mitigations in product context.')} actions={<button className="button primary" type="button" onClick={onAddThreat}><Plus size={14} />{tr('Добавить угрозу', 'Add threat')}</button>} /><div className="threat-model-grid">{data.threatModels.map((model) => {
    const item = data.products.find((product) => product.id === model.productId)!;
    const threats = data.threats.filter((threat) => threat.productId === item.id);
    const open = threats.filter((threat) => threat.status !== 'Mitigated').length;
    return <button className="threat-model-card" type="button" key={model.id} onClick={() => setProductId(item.id)}><div className="model-card-head"><EntityAvatar className="product-avatar" seed={item.id} name={item.name} avatarUrl={item.avatarUrl} /><StateBadge tone={slug(model.status)}>{model.status}</StateBadge></div><h2>{item.name}</h2><p>{item.description[locale]}</p><div className="model-stats"><span><strong>{threats.length}</strong><small>{tr('угроз', 'threats')}</small></span><span><strong>{open}</strong><small>{tr('открыто', 'open')}</small></span><span><strong>{data.topologyEdges.filter((edge) => edge.productId === item.id).length}</strong><small>flows</small></span></div><footer><span>{tr('Обновлено', 'Updated')} {formatDate(model.updatedAt, locale)}</span><ChevronRight size={15} /></footer></button>;
  })}</div></>;
}

function ThreatWorkspace({ locale, data, product, onAddThreat, onThreatStatus, onModelStatus }: { locale: Locale; data: AtlasState; product: Product; onAddThreat: () => void; onThreatStatus: (id: string, status: Threat['status']) => void; onModelStatus: (productId: string, status: ThreatModelStatus) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const model = data.threatModels.find((item) => item.productId === product.id);
  const threats = data.threats.filter((item) => item.productId === product.id);
  return <><PageHeader eyebrow="THREAT MODEL" title={product.name} description={tr('Угрозы привязаны к реальным узлам и data flows продукта.', 'Threats are attached to real product nodes and data flows.')} actions={<><StateBadge tone={slug(model?.status ?? 'draft')}>{model?.status ?? 'Draft'}</StateBadge><button className="button secondary" type="button" onClick={() => onModelStatus(product.id, 'In review')}>{tr('На review', 'Send to review')}</button><button className="button primary" type="button" onClick={onAddThreat}><Plus size={14} />{tr('Добавить угрозу', 'Add threat')}</button></>} /><div className="threat-workspace"><section className="panel threat-scope"><div className="panel-heading"><div><h2>{tr('Scope и topology', 'Scope and topology')}</h2><p>{tr('Production · подтверждённые связи', 'Production · confirmed relations')}</p></div><Network size={17} /></div><div className="scope-mini-map"><div className="mini-flow"><span>Customer</span><i>→</i><span>Customer Checkout Experience Frontend</span><i>→</i><span>Order Lifecycle Orchestration API</span><i>→</i><span>Payment Authorization Requested Production Events</span><i>→</i><span>Payment Authorization and Settlement Processing Worker</span></div><div className="scope-facts"><span><strong>{data.components.filter((item) => item.productIds.includes(product.id)).length}</strong><small>components</small></span><span><strong>{data.resources.filter((item) => item.productIds.includes(product.id)).length}</strong><small>resources</small></span><span><strong>{data.topologyEdges.filter((item) => item.productId === product.id).length}</strong><small>flows</small></span><span><strong>{data.topologyEdges.filter((item) => item.productId === product.id && item.crossesTrustBoundary).length}</strong><small>trust crossings</small></span></div></div></section><section className="panel threat-list-panel"><div className="panel-heading"><div><h2>{tr('Угрозы и mitigations', 'Threats and mitigations')}</h2><p>{tr('STRIDE — подсказка, а не обязательный опросник.', 'STRIDE is guidance, not a mandatory questionnaire.')}</p></div><button type="button" onClick={onAddThreat}><Plus size={13} />{tr('Новая угроза', 'New threat')}</button></div>{threats.length ? <div className="threat-list">{threats.map((threat) => <article key={threat.id}><div className="threat-head"><span className={`risk-matrix risk-${threat.likelihood * threat.impact}`}>{threat.likelihood * threat.impact}</span><div><span className="eyebrow">{threat.id} · {threat.stride}</span><h3>{threat.title[locale]}</h3></div><StateBadge tone={slug(threat.status)}>{threat.status}</StateBadge></div><p>{threat.scenario[locale]}</p><div className="mitigation"><ShieldCheck size={14} /><span><small>MITIGATION</small><strong>{threat.mitigation[locale]}</strong></span></div><footer><span>{data.teams.find((team) => team.id === threat.ownerTeamId)?.name}</span><span>{threat.targetType} · {threat.targetId}</span>{threat.status !== 'Mitigated' ? <button type="button" onClick={() => onThreatStatus(threat.id, 'Mitigated')}><CheckCircle2 size={13} />{tr('Отметить mitigated', 'Mark mitigated')}</button> : <span className="success-label"><Check size={12} />Mitigated</span>}</footer></article>)}</div> : <EmptyState icon={ShieldCheck} title={tr('Открытых угроз нет', 'No open threats')} copy={tr('Добавьте abuse-сценарий к узлу или data flow.', 'Add an abuse scenario to a node or data flow.')} />}</section><aside className="panel review-panel"><div className="panel-heading"><div><h2>{tr('Review', 'Review')}</h2></div></div><div className="review-steps"><span className="done"><i><Check size={11} /></i><strong>{tr('Scope подтверждён', 'Scope confirmed')}</strong><small>8 nodes · 7 flows</small></span><span className="done"><i><Check size={11} /></i><strong>{tr('Угрозы рассмотрены', 'Threats reviewed')}</strong><small>{threats.length} scenarios</small></span><span className={threats.some((item) => item.status !== 'Mitigated') ? 'current' : 'done'}><i>{threats.some((item) => item.status !== 'Mitigated') ? '3' : <Check size={11} />}</i><strong>{tr('Mitigations', 'Mitigations')}</strong><small>{threats.filter((item) => item.status !== 'Mitigated').length} open</small></span></div><button className="button primary full" type="button" onClick={() => onModelStatus(product.id, 'Approved')} disabled={threats.some((item) => item.status === 'Open')}>{tr('Одобрить модель', 'Approve model')}</button><p className="review-note">{tr('Изменение topology автоматически вернёт статус Needs review.', 'A topology change automatically returns the model to Needs review.')}</p></aside></div></>;
}

function TeamsView({ locale, data, onOpen, onCreate }: ViewProps & { onOpen: (id: string) => void; onCreate: () => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  return <><PageHeader eyebrow="OWNERSHIP" title={tr('Команды', 'Teams')} description={tr('Ответственные за продукты и компоненты команды разработки.', 'Engineering teams responsible for products and components.')} actions={<button className="button primary" type="button" onClick={onCreate}><Plus size={14} />{tr('Создать команду', 'Create team')}</button>} /><section className="panel table-panel teams-catalog"><div className="table-toolbar"><span className="table-count">{data.teams.length} {tr('команд', 'teams')}</span></div><div className="table-scroll" tabIndex={0} aria-label={tr('Таблица команд; прокрутите по горизонтали для просмотра всех столбцов.', 'Teams table; scroll horizontally to view all columns.')}><table className="data-table teams-table"><thead><tr><th><FieldLabel help="Engineering team that owns products and components.">{tr('Команда', 'Team')}</FieldLabel></th><th><FieldLabel help="Person accountable for the team and its application security context.">{tr('Владелец', 'Owner')}</FieldLabel></th><th><FieldLabel help="Number of active people assigned to this team.">{tr('Участники', 'Members')}</FieldLabel></th><th><FieldLabel help="Number of products for which this team is the assigned owner.">{tr('Продукты', 'Products')}</FieldLabel></th><th aria-label={tr('Открыть команду', 'Open team')} /></tr></thead><tbody>{data.teams.map((team) => <tr key={team.id}><td><button className="table-link" type="button" onClick={() => onOpen(team.id)}><span className="entity-name"><EntityAvatar className="team-avatar" seed={team.id} name={team.name} avatarUrl={team.avatarUrl} /><span><strong>{team.name}</strong><small>{data.components.filter((component) => component.ownerTeamId === team.id).length} {tr('компонентов', 'components')}</small></span></span></button></td><td><span className="team-owner-contact"><strong>{team.lead}</strong><small>{team.leadEmail || 'Email not set'}</small></span></td><td>{team.members}</td><td>{data.products.filter((product) => product.ownerTeamId === team.id).length}</td><td><button className="table-row-action" type="button" onClick={() => onOpen(team.id)} aria-label={`${tr('Open', 'Open')} ${team.name}`}><ChevronRight size={15} /></button></td></tr>)}</tbody></table></div></section></>;
}

function TeamWorkspace({ locale, data, team, onBack, onOpenProduct }: ViewProps & { team: Team; onBack: () => void; onOpenProduct: (id: string) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const products = data.products.filter((product) => product.ownerTeamId === team.id);
  const components = data.components.filter((component) => component.ownerTeamId === team.id);
  return <><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={13} />{tr('Все команды', 'All teams')}</button><header className="product-header final-product-header team-header"><div className="product-identity"><EntityAvatar className="product-avatar large team-avatar" seed={team.id} name={team.name} avatarUrl={team.avatarUrl} /><div><div className="product-title-row"><h1>{team.name}</h1></div><span className="product-key">{tr('Команда разработки и владелец AppSec-контекста', 'Engineering team and AppSec context owner')}</span></div></div></header><div className="team-workspace"><section className="panel team-information"><div className="panel-heading"><div><h2>{tr('Информация о команде', 'Team information')}</h2></div></div><dl><div><dt>{tr('Владелец', 'Owner')}</dt><dd>{team.lead}</dd></div><div><dt>Lead email</dt><dd>{team.leadEmail || 'Not set'}</dd></div><div><dt>Security Champion</dt><dd>{team.securityChampion}</dd></div><div><dt>{tr('Участники', 'Members')}</dt><dd>{team.members}</dd></div><div><dt>{tr('Продукты в ответственности', 'Owned products')}</dt><dd>{products.length}</dd></div><div><dt>{tr('Компоненты в ответственности', 'Owned components')}</dt><dd>{components.length}</dd></div></dl></section><section className="panel table-panel team-products"><div className="panel-heading"><div><h2>{tr('Продукты команды', 'Team products')}</h2></div></div>{products.length ? <div className="table-scroll" tabIndex={0} aria-label={tr('Таблица продуктов команды', 'Team products table')}><table className="data-table"><thead><tr><th>{tr('Продукт', 'Product')}</th><th>{tr('Критичность', 'Criticality')}</th><th>{tr('Компоненты', 'Components')}</th><th aria-label={tr('Открыть продукт', 'Open product')} /></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><button className="table-link" type="button" onClick={() => onOpenProduct(product.id)}><span className="entity-name"><span><strong>{product.name}</strong><small>{product.key}</small></span></span></button></td><td><SeverityBadge value={product.criticality} /></td><td>{data.components.filter((component) => component.productIds.includes(product.id)).length}</td><td><button className="table-row-action" type="button" onClick={() => onOpenProduct(product.id)} aria-label={`${tr('Open', 'Open')} ${product.name}`}><ChevronRight size={15} /></button></td></tr>)}</tbody></table></div> : <EmptyState icon={Boxes} title={tr('Продукты не назначены', 'No products assigned')} copy={tr('Назначьте команду владельцем продукта.', 'Assign this team as a product owner.')} />}</section><section className="panel team-components"><div className="panel-heading"><div><h2>{tr('Компоненты команды', 'Team components')}</h2></div><span className="table-count">{components.length}</span></div><div>{components.map((component) => <span key={component.id}><strong>{component.name}</strong><small>{component.kind}</small></span>)}</div></section></div></>;
}

function SettingsView({ locale, data, tab, setTab, onConnect, onUpload, onReset }: ViewProps & { tab: SettingsTab; setTab: (tab: SettingsTab) => void; onConnect: (id: string) => void; onUpload: () => void; onReset: () => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  return <><PageHeader title={tr('Настройки', 'Settings')} description={tr('Требования к проверкам и необязательные источники данных.', 'Check requirements and optional data sources.')} /><div className="settings-layout"><nav className="settings-nav"><button className={tab === 'profiles' ? 'active' : ''} type="button" onClick={() => setTab('profiles')}><SlidersHorizontal size={15} />{tr('Профили контроля', 'Control Profiles')}</button><button className={tab === 'integrations' ? 'active' : ''} type="button" onClick={() => setTab('integrations')}><GitBranch size={15} />{tr('Интеграции', 'Integrations')}</button><div /><button type="button" onClick={onReset}><RotateCcw size={15} />{tr('Сбросить demo', 'Reset demo')}</button></nav><section className="settings-content">
        {tab === 'profiles' ? <><div className="settings-heading"><div><h2>{tr('Coverage + SLA', 'Coverage + SLA')}</h2><p>{tr('Минимальные требования без сложного policy builder.', 'Minimum requirements without a complex policy builder.')}</p></div></div><div className="profiles-grid">{data.profiles.map((profile) => <article key={profile.id}><header><span className="profile-icon"><ShieldCheck size={19} /></span><div><h3>{profile.name[locale]}</h3><p>{profile.criticalities.join(', ')}</p></div><StateBadge tone="production">Enabled</StateBadge></header><div className="required-controls">{profile.requiredControls.map((control) => <span key={control}><Check size={11} />{control}<small>{profile.freshnessDays[control]}d</small></span>)}</div><div className="sla-table"><strong>SLA</strong>{(['Critical', 'High', 'Medium', 'Low'] as FindingSeverity[]).map((severity) => <span key={severity}><i className={severity.toLowerCase()} />{severity}<b>{profile.slaDays[severity]}d</b></span>)}</div><footer>{tr('Назначен автоматически по criticality', 'Assigned automatically by criticality')}</footer></article>)}</div></> : null}
        {tab === 'integrations' ? <><div className="settings-heading"><div><h2>{tr('Необязательные источники данных', 'Optional data sources')}</h2><p>{tr('Платформа работает и без них: продукты, компоненты, инфраструктуру и topology можно создавать вручную, а отчёты — импортировать.', 'The platform works without them: products, components, infrastructure, and topology can be created manually, while reports can be imported.')}</p></div><button className="button secondary" type="button" onClick={onUpload}><Upload size={14} />{tr('Загрузить отчёт', 'Upload report')}</button></div><div className="integration-grid">{data.integrations.map((integration) => <IntegrationCard key={integration.id} locale={locale} integration={integration} onConnect={() => onConnect(integration.id)} />)}</div><div className="source-principle"><KeyRound size={17} /><div><strong>{tr('Ручные данные остаются под контролем пользователя', 'Manual data stays under user control')}</strong><p>{tr('Синхронизация сохраняет source, confidence и Suggested/Confirmed. Подтверждённые поля не перезаписываются бесследно.', 'Sync preserves source, confidence, and Suggested/Confirmed. Confirmed fields are never silently overwritten.')}</p></div></div></> : null}
      </section></div></>;
}

function IntegrationCard({ locale, integration, onConnect }: { locale: Locale; integration: Integration; onConnect: () => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const icon: Record<Integration['kind'], LucideIcon> = { SCM: GitBranch, Scanner: FileSearch, 'Issue tracker': ListChecks, Import: CloudUpload };
  const Icon = icon[integration.kind];
  return <article className="integration-card"><header><span><Icon size={18} /></span><StateBadge tone={slug(integration.status)}>{integration.status}</StateBadge></header><h3>{integration.name}</h3><p>{integration.description[locale]}</p><footer>{integration.status === 'Connected' ? <span><CheckCircle2 size={13} />{tr('Последняя синхронизация', 'Last sync')} {formatDate(integration.lastSync, locale, true)}</span> : <button className="button secondary compact" type="button" onClick={onConnect}>{tr('Подключить demo', 'Connect demo')}</button>}</footer></article>;
}

function FindingDrawer({ locale, finding, data, onClose, onStatus, onException }: { locale: Locale; finding: Finding; data: AtlasState; onClose: () => void; onStatus: (status: FindingStatus) => void; onException: () => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const activeException = data.exceptions.find((item) => item.findingId === finding.id && new Date(item.expiresAt) > new Date());
  return <DrawerShell title={finding.id} onClose={onClose}><div className="drawer-finding-head"><SeverityBadge value={finding.severity} /><StateBadge tone={slug(finding.status)}>{finding.status}</StateBadge><SourcePill source={finding.source} confidence={finding.confidence} state={finding.state} /></div><h2 className="drawer-title">{finding.title[locale]}</h2><p className="drawer-description">{finding.description[locale]}</p><div className="context-strip">{finding.contexts.map((item) => <span key={item}>{item}</span>)}</div>{activeException ? <div className="exception-banner"><Clock3 size={15} /><div><strong>{tr('Действующее исключение', 'Active exception')}</strong><p>{activeException.reason} · {tr('до', 'until')} {formatDate(activeException.expiresAt, locale)}</p></div></div> : null}<section className="drawer-section"><h3>{tr('Затронутый контекст', 'Affected context')}</h3><dl className="drawer-details"><div><dt>{tr('Продукты', 'Products')}</dt><dd>{finding.productIds.map((id) => data.products.find((product) => product.id === id)?.name).filter(Boolean).join(', ')}</dd></div><div><dt>{tr('Компонент', 'Component')}</dt><dd>{data.components.find((item) => item.id === finding.componentId)?.name ?? tr('Не найден', 'Not found')}</dd></div><div><dt>{tr('Владелец', 'Owner')}</dt><dd>{data.teams.find((team) => team.id === finding.ownerTeamId)?.name}</dd></div><div><dt>Assignee</dt><dd>{finding.assignee}</dd></div><div><dt>SLA</dt><dd>{formatDate(finding.due, locale)}</dd></div><div><dt>{tr('Категория', 'Category')}</dt><dd>{finding.category}</dd></div></dl></section><section className="drawer-section"><h3>Evidence</h3>{finding.occurrences.length ? <div className="evidence-list">{finding.occurrences.map((occurrence) => <div key={occurrence.id}><code>{occurrence.location}</code><span>revision {occurrence.revision}</span>{occurrence.maskedEvidence ? <strong>{occurrence.maskedEvidence}</strong> : null}<small>{tr('Последний раз', 'Last seen')} {formatDate(occurrence.lastSeen, locale, true)}</small></div>)}</div> : <p className="drawer-muted">{tr('У находки нет scanner evidence.', 'This finding has no scanner evidence.')}</p>}</section><section className="drawer-section remediation-box"><span><ShieldCheck size={16} /></span><div><h3>Remediation</h3><p>{finding.remediation[locale]}</p></div></section><section className="drawer-section"><h3>{tr('Изменить статус', 'Change status')}</h3><div className="status-actions">{findingStatuses.map((status) => <button className={finding.status === status ? 'active' : ''} type="button" key={status} onClick={() => onStatus(status)}>{finding.status === status ? <Check size={11} /> : null}{status}</button>)}</div></section><footer className="drawer-footer"><button className="button secondary" type="button" onClick={onException}><Clock3 size={14} />{tr('Запросить исключение', 'Request exception')}</button><button className="button primary" type="button" onClick={() => onStatus('In progress')}>{tr('Начать работу', 'Start work')}</button></footer></DrawerShell>;
}

function ComponentReportsPage({ locale, evaluation, data, onUpload, onOpenFinding, onBack }: { locale: Locale; evaluation: CoverageEvaluation; data: AtlasState; onUpload: () => void; onOpenFinding: (id: string) => void; onBack: () => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const component = data.components.find((item) => item.id === evaluation.componentId);
  const reports = data.scanReports
    .filter((report) => report.componentId === evaluation.componentId && report.control === evaluation.control)
    .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt));
  return <div className="component-reports-page">
    <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={13} />{tr('Назад к Security', 'Back to Security')}</button>
    <PageHeader eyebrow={`${component?.name ?? 'Component'} · Security`} title={`${evaluation.control} ${tr('отчёты', 'reports')}`} description={tr('История загруженных отчётов и находок для выбранного типа проверки.', 'Uploaded report history and findings for this security check.')} actions={<button className="button primary" type="button" onClick={onUpload} disabled={evaluation.status === 'Not applicable'}><Upload size={14} />{tr('Загрузить отчёт', 'Upload report')}</button>} />
    <section className="panel report-evaluation-summary" aria-label={tr('Текущая оценка', 'Current evaluation')}>
      <div><small>{tr('Статус', 'Status')}</small><strong className={`large-status ${slug(evaluation.status)}`}><i />{statusCopy[evaluation.status][locale]}</strong></div>
      <div><small>{tr('Инструмент', 'Tool')}</small><strong>{evaluation.tool ?? tr('Не настроен', 'Not configured')}</strong></div>
      <div><small>{tr('Последний отчёт', 'Latest report')}</small><strong>{formatDate(evaluation.lastRun, locale, true)}</strong></div>
      <div><small>Branch</small><strong>{evaluation.branch ?? '—'}</strong></div>
    </section>
    <section className="panel reports-history-panel"><div className="panel-heading"><div><h2>{tr('Загруженные отчёты', 'Uploaded reports')}</h2></div><span className="table-count">{reports.length}</span></div>{reports.length ? <div className="scan-report-list">{reports.map((report) => {
      const reportFindings = report.findingIds.map((id) => data.findings.find((finding) => finding.id === id)).filter((finding): finding is Finding => Boolean(finding));
      return <article key={report.id}><header><span><strong>{report.id}</strong><small>{report.tool} · {formatDate(report.finishedAt, locale, true)}</small></span><StateBadge tone={report.status === 'Failed' ? 'error' : report.findingIds.length ? 'needs-review' : 'resolved'}>{report.status}</StateBadge></header><dl><div><dt>Revision</dt><dd>{report.revision ?? '—'}</dd></div>{report.branch ? <div><dt>Branch</dt><dd>{report.branch}</dd></div> : null}<div><dt>{tr('Находки в отчёте', 'Report findings')}</dt><dd>{reportFindings.length}</dd></div></dl>{reportFindings.length ? <div className="report-findings">{reportFindings.map((finding) => <button type="button" key={finding.id} onClick={() => onOpenFinding(finding.id)}><SeverityBadge value={finding.severity} /><span><strong>{finding.title[locale]}</strong><small>{finding.id} · {finding.status}</small></span><ChevronRight size={14} /></button>)}</div> : <p className="clean-report"><CheckCircle2 size={14} />{tr('В этом отчёте находок нет.', 'This report contains no findings.')}</p>}</article>;
    })}</div> : <EmptyState icon={FileSearch} title={tr('Отчётов пока нет', 'No reports yet')} copy={tr('Загрузите первый отчёт для этого компонента и типа проверки.', 'Upload the first report for this component and check type.')} action={<button className="button primary" type="button" onClick={onUpload}><Upload size={14} />{tr('Загрузить отчёт', 'Upload report')}</button>} />}</section>
    <div className="unknown-note"><CircleAlert size={15} /><p>{tr('Unknown или Gap никогда не интерпретируются как успешная проверка.', 'Unknown or Gap is never interpreted as a successful check.')}</p></div>
  </div>;
}

function TopologyDrawer({ locale, node, edge, data, onClose, onAddThreat }: { locale: Locale; node?: TopologyNode; edge?: TopologyEdge; data: AtlasState; onClose: () => void; onAddThreat: (target: { type: 'Node' | 'Edge'; id: string }) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const sourceNode = edge ? data.topologyNodes.find((item) => item.id === edge.sourceId) : undefined;
  const targetNode = edge ? data.topologyNodes.find((item) => item.id === edge.targetId) : undefined;
  const source = node ?? edge;
  if (!source) return null;
  return <DrawerShell title={node ? tr('Узел topology', 'Topology node') : tr('Data flow', 'Data flow')} onClose={onClose}><div className="drawer-finding-head"><StateBadge tone="production">{node?.kind ?? edge?.type}</StateBadge><SourcePill source={source.source} confidence={source.confidence} state={source.state} /></div><h2 className="drawer-title">{node?.name ?? `${sourceNode?.name} → ${targetNode?.name}`}</h2>{edge ? <p className="drawer-description">{edge.type.replaceAll('_', ' ')} · {edge.protocol ?? 'protocol not set'}</p> : null}<section className="drawer-section"><h3>{tr('Контекст', 'Context')}</h3><dl className="drawer-details">{node ? <><div><dt>{tr('Владелец', 'Owner')}</dt><dd>{data.teams.find((team) => team.id === node.ownerTeamId)?.name ?? tr('Не назначен', 'Unassigned')}</dd></div><div><dt>Environment</dt><dd>{node.environment ?? 'Logical'}</dd></div><div><dt>Source</dt><dd>{node.source} · {node.state}</dd></div><div><dt>Confidence</dt><dd>{node.confidence}%</dd></div></> : <><div><dt>Source</dt><dd>{sourceNode?.name}</dd></div><div><dt>Target</dt><dd>{targetNode?.name}</dd></div><div><dt>Authenticated</dt><dd>{edge?.authenticated ? 'Yes' : 'No / unknown'}</dd></div><div><dt>Encrypted</dt><dd>{edge?.encrypted ? 'Yes' : 'No / unknown'}</dd></div><div><dt>Trust boundary</dt><dd>{edge?.crossesTrustBoundary ? 'Crosses boundary' : 'Internal'}</dd></div></>}</dl></section><footer className="drawer-footer"><button className="button primary full" type="button" onClick={() => onAddThreat({ type: node ? 'Node' : 'Edge', id: source.id })}><ShieldEllipsis size={14} />{tr('Добавить угрозу к этому элементу', 'Add threat to this element')}</button></footer></DrawerShell>;
}

function DrawerShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement);
  useEffect(() => {
    const restoreFocusElement = restoreFocusRef.current;
    const background = Array.from(document.querySelectorAll<HTMLElement>('.atlas-app > .sidebar, .atlas-app > .app-frame'));
    background.forEach((element) => element.setAttribute('inert', ''));
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const first = focusable()[0];
    first?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('.modal-backdrop')) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      background.forEach((element) => element.removeAttribute('inert'));
      if (restoreFocusElement?.isConnected) restoreFocusElement.focus();
    };
  }, [onClose]);
  return <><button className="drawer-backdrop" type="button" onClick={onClose} aria-label="Close drawer" /><aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-dialog-title"><header className="drawer-head"><strong id="drawer-dialog-title">{title}</strong><button type="button" onClick={onClose} aria-label="Close drawer"><X size={16} /></button></header><div className="drawer-body">{children}</div></aside></>;
}

function ModalShell({ title, eyebrow, children, onClose, size = '' }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void; size?: string }) {
  const modalRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement);
  useEffect(() => {
    const restoreFocusElement = restoreFocusRef.current;
    const background = Array.from(document.querySelectorAll<HTMLElement>('.atlas-app > .sidebar, .atlas-app > .app-frame'));
    background.forEach((element) => element.setAttribute('inert', ''));
    const focusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const first = focusable()[0];
    first?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      background.forEach((element) => element.removeAttribute('inert'));
      if (restoreFocusElement?.isConnected) restoreFocusElement.focus();
    };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section ref={modalRef} className={`modal ${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-dialog-title"><header><div>{eyebrow ? <span>{eyebrow}</span> : null}<h2 id="modal-dialog-title">{title}</h2></div><button type="button" onClick={onClose} aria-label="Close dialog"><X size={16} /></button></header>{children}</section></div>;
}

function InfrastructureTemplateEditModal({ locale, item, onClose, onSave }: { locale: Locale; item: InfrastructureCatalogItem; onClose: () => void; onSave: (item: InfrastructureCatalogItem) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const [name, setName] = useState(item.name);
  const [componentKind, setComponentKind] = useState<ComponentKind>(item.componentKind);
  const [category, setCategory] = useState<InfrastructureCategory>(item.category);
  const [description, setDescription] = useState(item.description[locale]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      ...item,
      name: name.trim(),
      componentKind,
      category,
      description: { ...item.description, [locale]: description.trim() },
      source: 'Manual',
      confidence: 100,
      state: 'Confirmed',
    });
  }

  return <ModalShell title={tr('Редактировать шаблон', 'Edit template')} onClose={onClose} size="wide">
    <form className="modal-form infrastructure-template-form" onSubmit={submit}>
      <label className="full"><span>{tr('Название', 'Name')} <b>*</b></span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><FieldLabel help="Determines which kind of component can be created from this template.">{tr('Тип компонента', 'Component type')}</FieldLabel><select value={componentKind} onChange={(event) => setComponentKind(event.target.value as ComponentKind)}><option>Backend Service</option><option>Frontend Service</option><option>Infrastructure Component</option></select></label>
      <label><FieldLabel help="Defines how the template is grouped and presented in the templates catalog.">{tr('Категория', 'Category')}</FieldLabel><select value={category} onChange={(event) => setCategory(event.target.value as InfrastructureCategory)}>{infrastructureCategories.map((value) => <option key={value} value={value}>{infrastructureCategoryLabel(value, locale)}</option>)}</select></label>
      <label className="full"><span>{tr('Описание', 'Description')}</span><textarea rows={4} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe how this infrastructure is used by application teams." /></label>
      <footer className="full"><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit" disabled={!name.trim()}><Check size={14} />{tr('Сохранить', 'Save changes')}</button></footer>
    </form>
  </ModalShell>;
}

function CreateModal({ locale, data, initialKind, initialInfrastructureTemplateId, initialProductId, onClose, onCreate }: { locale: Locale; data: AtlasState; initialKind: string; initialInfrastructureTemplateId: string | null; initialProductId: string | null; onClose: () => void; onCreate: (data: AtlasState) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const kind = initialKind;
  const [selectedProductId, setSelectedProductId] = useState(initialProductId ?? data.products[0]?.id ?? '');
  const [componentKind, setComponentKind] = useState<ComponentKind>(initialInfrastructureTemplateId ? 'Infrastructure Component' : 'Backend Service');
  const [selectedInfrastructureTemplateId, setSelectedInfrastructureTemplateId] = useState(initialInfrastructureTemplateId ?? data.infrastructureCatalog[0]?.id ?? '');
  const initialTemplate = data.infrastructureCatalog.find((item) => item.id === initialInfrastructureTemplateId);
  const [nameValue, setNameValue] = useState(initialTemplate?.name ?? '');
  const [stackItems, setStackItems] = useState<string[]>(initialTemplate ? [initialTemplate.name] : []);
  const [stackInput, setStackInput] = useState('');
  const threatTargets = [...data.topologyNodes.filter((node) => node.productIds.includes(selectedProductId)).map((node) => ({ type: 'Node' as const, id: node.id, name: node.name })), ...data.topologyEdges.filter((edge) => edge.productId === selectedProductId).map((edge) => ({ type: 'Edge' as const, id: edge.id, name: `${data.topologyNodes.find((node) => node.id === edge.sourceId)?.name} → ${data.topologyNodes.find((node) => node.id === edge.targetId)?.name}` }))];
  function selectProduct(id: string) {
    setSelectedProductId(id);
  }
  function addStackItems(rawValue: string) {
    const candidates = rawValue.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
    if (!candidates.length) return;
    setStackItems((current) => candidates.reduce((items, candidate) => items.some((value) => value.toLowerCase() === candidate.toLowerCase()) ? items : [...items, candidate], current));
    setStackInput('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') || tr('Новый объект', 'New object'));
    const id = `manual-${Date.now()}`;
    const productId = String(values.get('productId') || data.products[0].id);
    const teamId = String(values.get('teamId') || data.teams[0].id);
    let next = { ...data };
    if (kind === 'Component') {
      const selectedTemplate = next.infrastructureCatalog.find((item) => item.id === String(values.get('infrastructureTemplateId')));
      const isInfrastructure = componentKind === 'Infrastructure Component';
      const repositoryUrl = String(values.get('repositoryUrl') || '').trim();
      const deploymentUrl = String(values.get('deploymentUrl') || '').trim();
      const apiType = isInfrastructure ? 'Not applicable' : String(values.get('apiType') || 'REST') as ComponentApiType;
      const normalizedRepositoryUrl = repositoryUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '');
      const existingRepository = normalizedRepositoryUrl ? next.repositories.find((repository) => repository.url.toLowerCase().replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/\/$/, '') === normalizedRepositoryUrl) : undefined;
      const repositoryId = existingRepository?.id ?? (normalizedRepositoryUrl ? `repo-${id}` : '');
      const repositoryProvider: 'GitHub' | 'GitLab' | 'Bitbucket' = normalizedRepositoryUrl.includes('gitlab') ? 'GitLab' : normalizedRepositoryUrl.includes('bitbucket') ? 'Bitbucket' : 'GitHub';
      const repositoryName = normalizedRepositoryUrl.split('/').pop() || `${slug(name)}-repo`;
      const repositoryBinding = !isInfrastructure && repositoryId ? [{ repositoryId, path: String(values.get('path') || '/'), branch: 'main', role: 'Source' as const, source: 'Manual' as const, confidence: 100, state: 'Confirmed' as const }] : [];
      const submittedStack = [...stackItems, ...String(values.get('stack') || '').split(/[,\n]/)].map((value) => value.trim()).filter(Boolean).filter((value, index, items) => items.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
      const technologies = submittedStack.length ? submittedStack : isInfrastructure && selectedTemplate ? [selectedTemplate.name] : [];
      const componentDescription = String(values.get('description') || (isInfrastructure ? selectedTemplate?.description[locale] : '') || tr('Компонент создан вручную.', 'Manually created component.'));
      next = {
        ...next,
        repositories: !isInfrastructure && repositoryId && !existingRepository ? [...next.repositories, { id: repositoryId, name: repositoryName, provider: repositoryProvider, url: repositoryUrl, defaultBranch: 'main', source: 'Manual', confidence: 100, state: 'Confirmed' }] : next.repositories,
        components: [...next.components, { id, name, description: { ru: componentDescription, en: componentDescription }, kind: componentKind, apiType, ownerTeamId: teamId, productIds: [productId], technologies, infrastructureTemplateId: isInfrastructure ? selectedTemplate?.id : undefined, bindings: repositoryBinding, deployments: isInfrastructure && deploymentUrl ? [{ id: `${id}-production`, environment: 'Production', version: 'Not specified', revision: 'manual', url: deploymentUrl }] : [], source: 'Manual', confidence: 100, state: 'Confirmed' }],
        products: next.products.map((product) => product.id === productId ? { ...product, componentIds: [...product.componentIds, id] } : product),
        topologyNodes: [...next.topologyNodes, { id, name, kind: 'Component', productIds: [productId], refId: id, ownerTeamId: teamId, environment: 'Production', source: 'Manual', confidence: 100, state: 'Confirmed' }],
        coverage: [...next.coverage, ...componentControlTypes.map((control) => ({ id: `${id}-${slug(control)}`, productId, componentId: id, control, status: (isInfrastructure && control !== 'IaC' ? 'Not applicable' : 'Unknown') as CoverageStatus, evidence: isInfrastructure && control !== 'IaC' ? `${control} is not applicable to infrastructure components` : undefined }))],
      };
    } else if (kind === 'Infrastructure template') {
      const description = String(values.get('description') || tr('Пользовательский шаблон инфраструктуры.', 'Custom infrastructure template.'));
      next = { ...next, infrastructureCatalog: [...next.infrastructureCatalog, { id, name, description: { ru: description, en: description }, componentKind: String(values.get('templateComponentKind') || 'Infrastructure Component') as ComponentKind, category: normalizeInfrastructureCategory(values.get('infrastructureCategory')), custom: true, source: 'Manual', confidence: 100, state: 'Confirmed' }] };
    } else if (kind === 'Repository') {
      next = { ...next, repositories: [...next.repositories, { id, name, provider: String(values.get('provider') || 'GitHub') as 'GitHub', url: String(values.get('url') || `github.com/acme/${slug(name)}`), defaultBranch: 'main', source: 'Manual', confidence: 100, state: 'Confirmed' }] };
    } else if (kind === 'Resource') {
      const resourceKind = String(values.get('resourceKind') || 'Database') as ApplicationResource['kind'];
      next = { ...next, resources: [...next.resources, { id, name, kind: resourceKind, ownerTeamId: teamId, productIds: [productId], environment: 'Production', technology: String(values.get('technology') || 'Not specified'), dataClassification: 'Internal', source: 'Manual', confidence: 100, state: 'Confirmed' }], topologyNodes: [...next.topologyNodes, { id, name, kind: resourceKind === 'External Service' ? 'External System' : 'Resource', productIds: [productId], refId: id, ownerTeamId: teamId, environment: 'Production', source: 'Manual', confidence: 100, state: 'Confirmed' }] };
    } else if (kind === 'Team') {
      next = { ...next, teams: [...next.teams, { id, name, lead: String(values.get('lead') || 'Unassigned'), leadEmail: String(values.get('leadEmail') || ''), securityChampion: 'Unassigned', members: 1, source: 'Manual', confidence: 100, state: 'Confirmed' }] };
    } else if (kind === 'Threat') {
      const [targetType, targetId] = String(values.get('target')).split(':') as ['Node' | 'Edge', string];
      next = { ...next, threats: [...next.threats, { id: `THR-${String(Date.now()).slice(-3)}`, productId, targetType, targetId, title: { ru: name, en: name }, scenario: { ru: String(values.get('description') || 'Новый abuse-сценарий.'), en: String(values.get('description') || 'New abuse scenario.') }, stride: 'Tampering', likelihood: 2, impact: 2, ownerTeamId: teamId, mitigation: { ru: 'Mitigation требует уточнения.', en: 'Mitigation to be defined.' }, status: 'Open', source: 'Manual', confidence: 100, state: 'Confirmed' }], threatModels: next.threatModels.map((model) => model.productId === productId ? { ...model, status: 'Needs review' } : model) };
    }
    onCreate(next);
  }
  const needsProduct = ['Component', 'Resource', 'Threat'].includes(kind);
  const needsTeam = ['Component', 'Resource', 'Threat'].includes(kind);
  const createTitle = ({ Component: 'Create component', 'Infrastructure template': 'Create component template', Repository: 'Create repository', Resource: 'Create application resource', Team: 'Create team', Threat: 'Create threat' } as Record<string, string>)[kind] ?? 'Create item';
  return <ModalShell title={createTitle} onClose={onClose} size="wide"><form className="modal-form" onSubmit={submit} noValidate>
    <label className="full"><FieldLabel help="The human-readable name used to identify this item across the application." required>{tr('Название', 'Name')}</FieldLabel><input name="name" required value={nameValue} onChange={(event) => setNameValue(event.target.value)} placeholder={tr('Введите понятное название', 'Enter a clear name')} /></label>
    {needsProduct ? <label><FieldLabel help="Product to which this component, resource, or threat belongs.">{tr('Продукт', 'Product')}</FieldLabel><select name="productId" value={selectedProductId} onChange={(event) => selectProduct(event.target.value)}>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : null}
    {needsTeam ? <label><FieldLabel help="Team responsible for maintaining this item and remediating its security risks.">{tr('Команда-владелец', 'Owning team')}</FieldLabel><select name="teamId">{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label> : null}
    {kind === 'Component' ? <>
      <label><FieldLabel help="Backend, Frontend, or Infrastructure determines the component context and applicable security checks.">{tr('Тип компонента', 'Component type')}</FieldLabel><select name="componentKind" value={componentKind} onChange={(event) => setComponentKind(event.target.value as ComponentKind)}><option>Backend Service</option><option>Frontend Service</option><option>Infrastructure Component</option></select></label>
      {componentKind === 'Infrastructure Component' ? <><label><FieldLabel help="Reusable database, queue or stream, storage, deployment environment, cache, or other infrastructure definition." required>{tr('Шаблон из справочника', 'Catalog template')}</FieldLabel><select name="infrastructureTemplateId" required value={selectedInfrastructureTemplateId} onChange={(event) => { const previous = data.infrastructureCatalog.find((item) => item.id === selectedInfrastructureTemplateId); const selected = data.infrastructureCatalog.find((item) => item.id === event.target.value); setSelectedInfrastructureTemplateId(event.target.value); if (!nameValue || nameValue === previous?.name) setNameValue(selected?.name ?? ''); }}>{data.infrastructureCatalog.map((item) => <option key={item.id} value={item.id}>{item.name} · {infrastructureCategoryLabel(item.category, locale)}</option>)}</select></label><label><FieldLabel help="Direct HTTPS link to the concrete environment or stand where this infrastructure component runs." required>Location URL</FieldLabel><input name="deploymentUrl" type="url" required placeholder="https://platform.example.com/environments/production" /></label></> : <><label><FieldLabel help="Primary API or interaction style exposed by the component." required>API type</FieldLabel><select name="apiType" required defaultValue="REST">{componentApiTypes.filter((value) => value !== 'Not applicable').map((value) => <option key={value}>{value}</option>)}</select></label><label><FieldLabel help="Full HTTPS URL of the source repository. A repository record will be created automatically." required>Repository URL</FieldLabel><input name="repositoryUrl" type="url" required placeholder="https://github.com/acme/service" /></label><label><FieldLabel help="Path to the component inside a monorepo. Use / when the entire repository is the component.">Monorepo path</FieldLabel><input name="path" defaultValue="/" placeholder="/services/example" /></label></>}
      <div className="form-field stack-field full">
        <FieldLabel help="Primary languages, frameworks, runtimes, and technologies used by this component.">Stack</FieldLabel>
        {stackItems.length ? <div className="stack-chips" role="list">{stackItems.map((technology) => <span role="listitem" key={technology}>{technology}<button type="button" onClick={() => setStackItems((items) => items.filter((item) => item !== technology))} aria-label={`Remove ${technology} from stack`}><X size={11} /></button></span>)}</div> : null}
        <div className="stack-input-row"><input name="stack" value={stackInput} onChange={(event) => setStackInput(event.target.value)} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addStackItems(stackInput); } else if (event.key === 'Backspace' && !stackInput && stackItems.length) { event.preventDefault(); setStackItems((items) => items.slice(0, -1)); } else if (event.key === 'Escape' && stackInput) { event.preventDefault(); event.stopPropagation(); setStackInput(''); } }} onPaste={(event) => { const pasted = event.clipboardData.getData('text'); if (/[,\n]/.test(pasted)) { event.preventDefault(); addStackItems(pasted); } }} placeholder="Go, React, Spring Boot…" aria-label="Add a language, framework, or technology" /><button className="button secondary compact" type="button" disabled={!stackInput.trim()} onClick={() => addStackItems(stackInput)}><Plus size={12} />Add</button></div>
        <small>Press Enter or comma to add an item.</small>
      </div>
    </> : null}
    {kind === 'Infrastructure template' ? <><label><FieldLabel help="Determines which kind of component can be created from this template.">{tr('Тип компонента', 'Component type')}</FieldLabel><select name="templateComponentKind" defaultValue="Infrastructure Component"><option>Backend Service</option><option>Frontend Service</option><option>Infrastructure Component</option></select></label><label><FieldLabel help="Category used to organize this reusable definition in the templates catalog.">{tr('Категория', 'Category')}</FieldLabel><select name="infrastructureCategory">{infrastructureCategories.map((category) => <option key={category} value={category}>{infrastructureCategoryLabel(category, locale)}</option>)}</select></label></> : null}
    {kind === 'Resource' ? <><label><FieldLabel help="Role of the application resource in product topology.">{tr('Тип ресурса', 'Resource type')}</FieldLabel><select name="resourceKind"><option>External Service</option><option>API</option><option>Secret Store</option></select></label><label><FieldLabel help="Implementation or protocol used by the resource, for example HTTPS API or Vault.">{tr('Технология', 'Technology')}</FieldLabel><input name="technology" placeholder="HTTPS API…" /></label></> : null}
    {kind === 'Repository' ? <><label><FieldLabel help="Source code management platform that hosts the repository.">Provider</FieldLabel><select name="provider"><option>GitHub</option><option>GitLab</option><option>Bitbucket</option></select></label><label><FieldLabel help="Canonical repository address without embedded credentials.">URL</FieldLabel><input name="url" type="url" placeholder="https://github.com/acme/repo" /></label></> : null}
    {kind === 'Team' ? <><label><FieldLabel help="Person accountable for the team and its application security context.">Owner</FieldLabel><input name="lead" placeholder="Name" /></label><label><FieldLabel help="Email address used to contact the team lead.">Lead email</FieldLabel><input name="leadEmail" type="email" placeholder="lead@company.com" /></label></> : null}
    {kind === 'Threat' ? <><label className="full"><FieldLabel help="Architecture node or data flow to which this threat will be attached." required>Node / data flow</FieldLabel><select name="target" required>{threatTargets.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type} · {item.name}</option>)}</select></label>{threatTargets.length === 0 ? <div className="exception-warning full"><CircleAlert size={15} /><p>{tr('У выбранного продукта пока нет topology target.', 'The selected product has no topology target yet.')}</p></div> : null}</> : null}
    {['Component', 'Infrastructure template', 'Threat'].includes(kind) ? <label className="full"><FieldLabel help="Short context that helps other users understand the purpose and boundaries of this item.">{tr('Описание', 'Description')}</FieldLabel><textarea name="description" rows={3} placeholder={tr('Короткий контекст для других пользователей', 'Short context for other users')} /></label> : null}
    <footer className="full"><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit" disabled={kind === 'Threat' && threatTargets.length === 0}><Plus size={14} />{createTitle}</button></footer>
  </form></ModalShell>;
}

function UploadModal({ locale, data, target, onClose, onImport }: { locale: Locale; data: AtlasState; target: ReportUploadTarget; onClose: () => void; onImport: (payload: { productId: string; componentId: string; control: ReportControl; reportType: string; externalRunId: string }) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const fixedComponent = target.componentId ? data.components.find((component) => component.id === target.componentId) : undefined;
  const initialProductId = fixedComponent?.productIds[0] ?? data.products[0]?.id ?? '';
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const firstComponentId = fixedComponent?.id ?? data.components.find((component) => component.productIds.includes(initialProductId))?.id ?? '';
  const [selectedComponentId, setSelectedComponentId] = useState(firstComponentId);
  const availableComponents = data.components.filter((component) => component.productIds.includes(selectedProductId));
  const fixedControl = target.control;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    onImport({
      productId: String(values.get('productId')),
      componentId: String(values.get('componentId')),
      control: String(values.get('control')) as ReportControl,
      reportType: String(values.get('reportType')),
      externalRunId: String(values.get('externalRunId')),
    });
  }

  return <ModalShell title={tr('Загрузить отчёт компонента', 'Upload component report')} onClose={onClose} size="wide"><form className="modal-form" onSubmit={submit}>
    <label><FieldLabel help="Product context in which the component report will be recorded." required>{tr('Продукт', 'Product')}</FieldLabel><select name="productId" required value={selectedProductId} disabled={Boolean(fixedComponent)} onChange={(event) => { const nextProductId = event.target.value; setSelectedProductId(nextProductId); setSelectedComponentId(data.components.find((component) => component.productIds.includes(nextProductId))?.id ?? ''); }}>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>{fixedComponent ? <input type="hidden" name="productId" value={selectedProductId} /> : null}</label>
    <label><FieldLabel help="Component to which the uploaded scan report and its findings belong." required>{tr('Компонент', 'Component')}</FieldLabel><select name="componentId" required value={selectedComponentId} disabled={Boolean(fixedComponent)} onChange={(event) => setSelectedComponentId(event.target.value)}>{availableComponents.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select>{fixedComponent ? <input type="hidden" name="componentId" value={selectedComponentId} /> : null}</label>
    <label><FieldLabel help="Security check whose report history will receive this upload." required>{tr('Тип проверки', 'Check type')}</FieldLabel><select name="control" required defaultValue={fixedControl ?? 'SAST'} disabled={Boolean(fixedControl)}>{componentControlTypes.map((control) => <option key={control} value={control}>{control}</option>)}</select>{fixedControl ? <input type="hidden" name="control" value={fixedControl} /> : null}</label>
    <label><FieldLabel help="File format produced by the scanner or dependency analysis tool." required>{tr('Формат отчёта', 'Report format')}</FieldLabel><select name="reportType" required><option>SARIF</option><option>CycloneDX</option><option>Semgrep JSON</option><option>Trivy JSON</option><option>Gitleaks JSON</option><option>Scanner JSON</option></select></label>
    <label className="full"><FieldLabel help="Identifier of the scanner execution or CI job that produced this report." required>External run ID</FieldLabel><input name="externalRunId" required placeholder="build-20260825-1842" /></label>
    <label className="file-drop full"><CloudUpload size={23} /><strong>{tr('Выберите файл отчёта', 'Choose a report file')}</strong><small>{tr('Файл будет обработан локально и добавлен в историю выбранной проверки.', 'The file will be processed locally and added to the selected check history.')}</small><input name="report" type="file" required accept=".json,.sarif,.xml" /></label>
    <div className="manual-data-note full"><CircleDot size={15} /><span><strong>Import · Suggested · 88%</strong><small>{tr('Находки сохраняют источник и проходят triage после загрузки.', 'Findings preserve their source and enter triage after upload.')}</small></span></div>
    <footer className="full"><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit"><Upload size={14} />{tr('Загрузить и обработать', 'Upload and process')}</button></footer>
  </form></ModalShell>;
}

function ExceptionModal({ locale, findingId, onClose, onCreate }: { locale: Locale; findingId: string; onClose: () => void; onCreate: (exception: RiskException) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); onCreate({ id: `exc-${Date.now()}`, findingId, reason: String(values.get('reason')), approver: String(values.get('approver')), expiresAt: String(values.get('expiresAt')), createdAt: new Date().toISOString() }); }
  return <ModalShell title={tr('Запросить исключение', 'Request exception')} eyebrow="RISK ACCEPTANCE" onClose={onClose}><form className="modal-form single" onSubmit={submit} noValidate><label><FieldLabel help="Why this risk cannot be remediated now and why temporary acceptance is justified." required>{tr('Причина', 'Reason')}</FieldLabel><textarea name="reason" required rows={4} placeholder={tr('Почему риск нельзя исправить сейчас?', 'Why can’t this risk be fixed now?')} /></label><label><FieldLabel help="The security owner who reviews and accepts this temporary risk." required>Approver</FieldLabel><input name="approver" required placeholder="Security owner" /></label><label><FieldLabel help="The date when this exception expires and the risk returns to the queue." required>{tr('Дата окончания', 'Expiration date')}</FieldLabel><input name="expiresAt" required type="date" min="2026-08-25" /></label><div className="exception-warning"><Clock3 size={15} /><p>{tr('Risk accepted не является статусом находки. После окончания исключения риск автоматически вернётся в очередь.', 'Risk accepted is not a finding status. After expiration, the risk automatically returns to the queue.')}</p></div><footer><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit">{tr('Создать исключение', 'Create exception')}</button></footer></form></ModalShell>;
}

function RelationModal({ locale, data, productId, onClose, onCreate }: { locale: Locale; data: AtlasState; productId: string; onClose: () => void; onCreate: (edge: TopologyEdge) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const productNodes = data.topologyNodes.filter((node) => node.productIds.includes(productId));
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); const sourceId = String(values.get('sourceId')); const targetId = String(values.get('targetId')); if (sourceId === targetId) return; onCreate({ id: `edge-${Date.now()}`, productId, sourceId, targetId, type: String(values.get('type')) as TopologyEdgeType, protocol: String(values.get('protocol') || ''), authenticated: values.get('authenticated') === 'on', encrypted: values.get('encrypted') === 'on', crossesTrustBoundary: values.get('boundary') === 'on', source: 'Manual', confidence: 100, state: 'Confirmed' }); }
  return <ModalShell title={tr('Добавить data flow', 'Add data flow')} eyebrow="APPLICATION TOPOLOGY" onClose={onClose} size="wide"><form className="modal-form" onSubmit={submit} noValidate><label><FieldLabel help="The topology node where this data flow starts." required>{tr('Источник', 'Source')}</FieldLabel><select name="sourceId" required>{productNodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label><FieldLabel help="The topology node that receives this data flow." required>{tr('Назначение', 'Target')}</FieldLabel><select name="targetId" required defaultValue={productNodes[1]?.id ?? productNodes[0]?.id}>{productNodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label><FieldLabel help="The operation this source performs on the target.">{tr('Тип связи', 'Relation type')}</FieldLabel><select name="type"><option>CALLS_API</option><option>READS_FROM</option><option>WRITES_TO</option><option>PUBLISHES_TO</option><option>CONSUMES_FROM</option><option>USES</option><option>EXPOSES</option></select></label><label><FieldLabel help="The network or messaging protocol used by this data flow.">Protocol</FieldLabel><input name="protocol" placeholder="HTTPS, Kafka, PostgreSQL…" /></label><div className="checkbox-grid full"><label><input type="checkbox" name="authenticated" defaultChecked /><FieldLabel help="Whether the source proves its identity before using this flow.">{tr('Аутентифицировано', 'Authenticated')}</FieldLabel></label><label><input type="checkbox" name="encrypted" defaultChecked /><FieldLabel help="Whether data is encrypted while it travels through this flow.">{tr('Зашифровано', 'Encrypted')}</FieldLabel></label><label><input type="checkbox" name="boundary" /><FieldLabel help="Whether this flow moves data between different trust zones.">{tr('Пересекает trust boundary', 'Crosses trust boundary')}</FieldLabel></label></div>{productNodes.length < 2 ? <div className="exception-warning full"><CircleAlert size={15} /><p>{tr('Сначала создайте минимум два элемента topology для этого продукта.', 'Create at least two topology elements for this product first.')}</p></div> : null}<div className="manual-data-note full"><ShieldCheck size={15} /><span><strong>Manual · Confirmed · 100%</strong><small>{tr('Изменение topology переведёт модель угроз в Needs review.', 'A topology change will move the threat model to Needs review.')}</small></span></div><footer className="full"><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit" disabled={productNodes.length < 2}><Plus size={14} />{tr('Добавить связь', 'Add relation')}</button></footer></form></ModalShell>;
}

function ThreatModal({ locale, data, productId, target, onClose, onCreate }: { locale: Locale; data: AtlasState; productId: string; target: { type: 'Node' | 'Edge'; id: string } | null; onClose: () => void; onCreate: (threat: Threat) => void }) {
  const tr = (ru: string, en: string) => locale === 'ru' ? ru : en;
  const targets = [...data.topologyNodes.filter((node) => node.productIds.includes(productId)).map((node) => ({ type: 'Node' as const, id: node.id, name: node.name })), ...data.topologyEdges.filter((edge) => edge.productId === productId).map((edge) => ({ type: 'Edge' as const, id: edge.id, name: `${data.topologyNodes.find((node) => node.id === edge.sourceId)?.name} → ${data.topologyNodes.find((node) => node.id === edge.targetId)?.name}` }))];
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); const [targetType, targetId] = String(values.get('target')).split(':') as ['Node' | 'Edge', string]; onCreate({ id: `THR-${String(Date.now()).slice(-3)}`, productId, targetType, targetId, title: { ru: String(values.get('title')), en: String(values.get('title')) }, scenario: { ru: String(values.get('scenario')), en: String(values.get('scenario')) }, stride: String(values.get('stride')) as Threat['stride'], likelihood: Number(values.get('likelihood')) as 1 | 2 | 3, impact: Number(values.get('impact')) as 1 | 2 | 3, ownerTeamId: String(values.get('teamId')), mitigation: { ru: String(values.get('mitigation')), en: String(values.get('mitigation')) }, status: 'Open', source: 'Manual', confidence: 100, state: 'Confirmed' }); }
  return <ModalShell title={tr('Добавить угрозу', 'Add threat')} eyebrow="GUIDED THREAT MODELING" onClose={onClose} size="wide"><form className="modal-form" onSubmit={submit} noValidate><label className="full"><FieldLabel help="The architecture node or data flow to which this threat is attached." required>Node / data flow</FieldLabel><select name="target" required defaultValue={target ? `${target.type}:${target.id}` : targets[0] ? `${targets[0].type}:${targets[0].id}` : undefined}>{targets.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type} · {item.name}</option>)}</select></label>{targets.length === 0 ? <div className="exception-warning full"><CircleAlert size={15} /><p>{tr('Сначала добавьте компонент или application resource в topology этого продукта.', 'Add a component or application resource to this product topology first.')}</p></div> : null}<label className="full"><FieldLabel help="A concise name that makes this threat easy to recognize in lists and reports." required>{tr('Короткое название', 'Short title')}</FieldLabel><input name="title" required placeholder={tr('Например: Replay payment message', 'For example: Replay payment message')} /></label><label className="full"><FieldLabel help="A concrete explanation of how an attacker could abuse this architecture element." required>Abuse scenario</FieldLabel><textarea name="scenario" required rows={3} placeholder={tr('Как злоумышленник использует этот элемент?', 'How could an attacker abuse this element?')} /></label><label><FieldLabel help="The STRIDE category that best describes the threat.">STRIDE hint</FieldLabel><select name="stride"><option>Spoofing</option><option>Tampering</option><option>Repudiation</option><option>Information Disclosure</option><option>Denial of Service</option><option>Elevation of Privilege</option></select></label><label><FieldLabel help="The team responsible for tracking and mitigating this threat.">{tr('Владелец', 'Owner')}</FieldLabel><select name="teamId">{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label><FieldLabel help="How likely this threat is to occur in the current architecture.">Likelihood</FieldLabel><select name="likelihood"><option value="1">1 · Low</option><option value="2">2 · Medium</option><option value="3">3 · High</option></select></label><label><FieldLabel help="The expected business and security consequence if the threat succeeds.">Impact</FieldLabel><select name="impact"><option value="1">1 · Low</option><option value="2">2 · Medium</option><option value="3">3 · High</option></select></label><label className="full"><FieldLabel help="The control or engineering action that reduces this threat." required>Mitigation</FieldLabel><textarea name="mitigation" required rows={3} placeholder={tr('Какой контроль уменьшает риск?', 'Which control reduces the risk?')} /></label><footer className="full"><button className="button secondary" type="button" onClick={onClose}>{tr('Отмена', 'Cancel')}</button><button className="button primary" type="submit" disabled={targets.length === 0}><Plus size={14} />{tr('Добавить угрозу', 'Add threat')}</button></footer></form></ModalShell>;
}
