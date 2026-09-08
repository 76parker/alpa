'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { inventoryClient, InventoryRequestError } from '../../lib/inventory/client';
import type {
  Component,
  CreateComponentInput,
  CreateProductInput,
  Product,
  Workspace,
} from '../../lib/inventory/contracts';

export const ACTIVE_WORKSPACE_KEY = 'appsec-atlas-active-workspace-v1';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type InventoryState = {
  workspaces: Workspace[];
  workspacesStatus: LoadStatus;
  workspacesError: string;
  activeWorkspaceID: number | null;
  products: Product[];
  productsStatus: LoadStatus;
  productsError: string;
  selectedProductID: number | null;
  components: Component[];
  componentsStatus: LoadStatus;
  componentsError: string;
};

type Action =
  | { type: 'workspaces_loading' }
  | { type: 'workspaces_loaded'; workspaces: Workspace[]; activeWorkspaceID: number | null }
  | { type: 'workspaces_failed'; message: string }
  | { type: 'workspace_created'; workspace: Workspace }
  | { type: 'workspace_selected'; workspaceID: number }
  | { type: 'products_loading'; workspaceID: number }
  | { type: 'products_loaded'; workspaceID: number; products: Product[] }
  | { type: 'products_failed'; workspaceID: number; message: string }
  | { type: 'product_created'; workspaceID: number; product: Product }
  | { type: 'product_selected'; productID: number | null }
  | { type: 'components_loading'; productID: number }
  | { type: 'components_loaded'; productID: number; components: Component[] }
  | { type: 'components_failed'; productID: number; message: string }
  | { type: 'component_created'; productID: number; component: Component }
  | { type: 'component_refreshed'; component: Component };

const initialState: InventoryState = {
  workspaces: [],
  workspacesStatus: 'idle',
  workspacesError: '',
  activeWorkspaceID: null,
  products: [],
  productsStatus: 'idle',
  productsError: '',
  selectedProductID: null,
  components: [],
  componentsStatus: 'idle',
  componentsError: '',
};

export function inventoryReducer(state: InventoryState, action: Action): InventoryState {
  switch (action.type) {
    case 'workspaces_loading':
      return { ...state, workspacesStatus: 'loading', workspacesError: '' };
    case 'workspaces_loaded':
      return {
        ...state,
        workspaces: action.workspaces,
        workspacesStatus: 'ready',
        activeWorkspaceID: action.activeWorkspaceID,
        productsStatus: action.activeWorkspaceID === null ? 'idle' : 'loading',
      };
    case 'workspaces_failed':
      return { ...state, workspacesStatus: 'error', workspacesError: action.message };
    case 'workspace_created':
      return {
        ...state,
        workspaces: [...state.workspaces, action.workspace],
        activeWorkspaceID: action.workspace.id,
        products: [],
        productsStatus: 'idle',
        selectedProductID: null,
        components: [],
        componentsStatus: 'idle',
      };
    case 'workspace_selected':
      return {
        ...state,
        activeWorkspaceID: action.workspaceID,
        products: [],
        productsStatus: 'loading',
        productsError: '',
        selectedProductID: null,
        components: [],
        componentsStatus: 'idle',
        componentsError: '',
      };
    case 'products_loading':
      if (state.activeWorkspaceID !== action.workspaceID) return state;
      return { ...state, productsStatus: 'loading', productsError: '' };
    case 'products_loaded':
      if (state.activeWorkspaceID !== action.workspaceID) return state;
      return { ...state, products: action.products, productsStatus: 'ready' };
    case 'products_failed':
      if (state.activeWorkspaceID !== action.workspaceID) return state;
      return { ...state, productsStatus: 'error', productsError: action.message };
    case 'product_created':
      if (state.activeWorkspaceID !== action.workspaceID) return state;
      return { ...state, products: [...state.products, action.product], productsStatus: 'ready' };
    case 'product_selected':
      return {
        ...state,
        selectedProductID: action.productID,
        components: [],
        componentsStatus: action.productID === null ? 'idle' : state.componentsStatus,
        componentsError: '',
      };
    case 'components_loading':
      if (state.selectedProductID !== action.productID) return state;
      return { ...state, componentsStatus: 'loading', componentsError: '' };
    case 'components_loaded':
      if (state.selectedProductID !== action.productID) return state;
      return { ...state, components: action.components, componentsStatus: 'ready' };
    case 'components_failed':
      if (state.selectedProductID !== action.productID) return state;
      return { ...state, componentsStatus: 'error', componentsError: action.message };
    case 'component_created':
      if (state.selectedProductID !== action.productID) return state;
      return { ...state, components: [...state.components, action.component], componentsStatus: 'ready' };
    case 'component_refreshed':
      if (state.selectedProductID !== action.component.product_id) return state;
      return {
        ...state,
        components: state.components.map((item) => item.id === action.component.id ? action.component : item),
      };
  }
}

function savedWorkspaceID() {
  try {
    const value = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    const parsed = value ? Number(value) : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function persistWorkspaceID(workspaceID: number | null) {
  try {
    if (workspaceID === null) window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    else window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, String(workspaceID));
  } catch {
    // Storage may be unavailable in private or constrained browsing contexts.
  }
}

function publicMessage(error: unknown) {
  if (error instanceof InventoryRequestError) return error.message;
  return 'The inventory request could not be completed';
}

type InventoryContextValue = InventoryState & {
  activeWorkspace?: Workspace;
  selectWorkspace: (workspaceID: number) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshProducts: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  loadComponents: (productID: number) => Promise<Component[]>;
  clearProductSelection: () => void;
  createComponent: (input: CreateComponentInput) => Promise<Component>;
  refreshComponent: (componentID: number) => Promise<Component>;
  addConsumerAPI: (componentID: number, apiID: number) => Promise<Component>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'workspaces_loading' });
    inventoryClient.listAllWorkspaces(controller.signal).then((workspaces) => {
      const savedID = savedWorkspaceID();
      const defaultWorkspaceID = workspaces.find((item) => item.name === 'default')?.id;
      const activeWorkspaceID = workspaces.some((item) => item.id === savedID)
        ? savedID
        : defaultWorkspaceID ?? workspaces[0]?.id ?? null;
      persistWorkspaceID(activeWorkspaceID);
      dispatch({ type: 'workspaces_loaded', workspaces, activeWorkspaceID });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      dispatch({ type: 'workspaces_failed', message: publicMessage(error) });
    });
    return () => controller.abort();
  }, []);

  const loadProducts = useCallback(async (workspaceID: number, signal?: AbortSignal) => {
    dispatch({ type: 'products_loading', workspaceID });
    try {
      const products = await inventoryClient.listAllProducts(workspaceID, signal);
      dispatch({ type: 'products_loaded', workspaceID, products });
    } catch (error) {
      if (signal?.aborted) return;
      dispatch({ type: 'products_failed', workspaceID, message: publicMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (state.activeWorkspaceID === null) return;
    const controller = new AbortController();
    void loadProducts(state.activeWorkspaceID, controller.signal);
    return () => controller.abort();
  }, [loadProducts, state.activeWorkspaceID]);

  const selectWorkspace = useCallback((workspaceID: number) => {
    persistWorkspaceID(workspaceID);
    dispatch({ type: 'workspace_selected', workspaceID });
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const workspace = await inventoryClient.createWorkspace(name);
    persistWorkspaceID(workspace.id);
    dispatch({ type: 'workspace_created', workspace });
    return workspace;
  }, []);

  const refreshProducts = useCallback(async () => {
    if (state.activeWorkspaceID === null) return;
    await loadProducts(state.activeWorkspaceID);
  }, [loadProducts, state.activeWorkspaceID]);

  const createProduct = useCallback(async (input: CreateProductInput) => {
    if (state.activeWorkspaceID === null) {
      throw new InventoryRequestError({ code: 'workspace_required', message: 'Choose a workspace first', status: 400 });
    }
    const product = await inventoryClient.createProduct(state.activeWorkspaceID, input);
    dispatch({ type: 'product_created', workspaceID: state.activeWorkspaceID, product });
    return product;
  }, [state.activeWorkspaceID]);

  const loadComponents = useCallback(async (productID: number) => {
    dispatch({ type: 'product_selected', productID });
    dispatch({ type: 'components_loading', productID });
    try {
      const components = await inventoryClient.listAllComponents(productID);
      dispatch({ type: 'components_loaded', productID, components });
      return components;
    } catch (error) {
      dispatch({ type: 'components_failed', productID, message: publicMessage(error) });
      throw error;
    }
  }, []);

  const clearProductSelection = useCallback(() => dispatch({ type: 'product_selected', productID: null }), []);

  const createComponent = useCallback(async (input: CreateComponentInput) => {
    const component = await inventoryClient.createComponent(input);
    dispatch({ type: 'component_created', productID: input.product_id, component });
    return component;
  }, []);

  const refreshComponent = useCallback(async (componentID: number) => {
    const component = await inventoryClient.getComponent(componentID);
    dispatch({ type: 'component_refreshed', component });
    return component;
  }, []);

  const addConsumerAPI = useCallback(async (componentID: number, apiID: number) => {
    await inventoryClient.addConsumerAPI(componentID, apiID);
    return refreshComponent(componentID);
  }, [refreshComponent]);

  const value = useMemo<InventoryContextValue>(() => ({
    ...state,
    activeWorkspace: state.workspaces.find((item) => item.id === state.activeWorkspaceID),
    selectWorkspace,
    createWorkspace,
    refreshProducts,
    createProduct,
    loadComponents,
    clearProductSelection,
    createComponent,
    refreshComponent,
    addConsumerAPI,
  }), [
    state,
    selectWorkspace,
    createWorkspace,
    refreshProducts,
    createProduct,
    loadComponents,
    clearProductSelection,
    createComponent,
    refreshComponent,
    addConsumerAPI,
  ]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
}
