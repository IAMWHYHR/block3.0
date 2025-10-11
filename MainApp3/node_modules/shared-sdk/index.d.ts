export interface ToolBarItem {
  id?: number | string;
  label: string;
  color?: string;
  onClick?: () => void;
}

export interface ToolbarAPI {
  addToolBarItem: (item: ToolBarItem) => boolean | Promise<boolean>;
  removeToolBarItem?: (id: number | string) => boolean | Promise<boolean>;
}

export interface EventBus {
  on: <T = any>(event: string, handler: (payload: T) => void) => () => void;
  off: <T = any>(event: string, handler: (payload: T) => void) => void;
  emit: <T = any>(event: string, payload: T) => void;
}

// 工具栏定制接口
export interface MenuItem {
  type: "item";
  // 菜单项编码
  code: string;
  // 工具提示
  tooltip?: string;
  // 菜单项图标
  icon: SVGElement | (() => SVGElement);
  // 是否显示背景，返回true显示背景, 默认不显示背景
  showBackground?: (editor: any) => boolean;
  // 是否禁用菜单项，默认启动，返回true表示禁用
  disabled?: (editor: any) => boolean;
  // 菜单单击回调函数
  onClick: (editor: any, event: Event) => void;
}

// 菜单分隔符
export interface MenuDivider {
  type: "divider";
}

export interface Toolbar {
  // 兼容旧接口
  addItem: (item: ToolBarItem) => boolean | Promise<boolean>;
  removeItem: (id: number | string) => boolean | Promise<boolean>;
  getItems: () => ToolBarItem[];
  
  // 工具栏定制接口
  // 获取工具栏上当前生效的菜单项列表
  getValidItems(): Array<MenuItem | MenuDivider>;
  // 在code指定的菜单项前添加菜单项，如果code为null，在菜单最前面添加菜单项
  insertBefore(items: Array<MenuItem | MenuDivider>, code: string | null): this;
  // 在菜单的最后添加菜单项
  appendItems(items: Array<MenuItem | MenuDivider>): this;
  // 删除指定的菜单项
  deleteItems(code: Array<string>): this;
  // 修改菜单项的冒泡提示和图标
  modifyItem(code: string, props: {
    tooltip?: string;
    icon?: SVGElement | (() => SVGElement);
    data?: any;
  }): this;
}

// 模态对话框选项
export interface OpenModalOptions {
  title?: string;
  content?: string;
  width?: number;
  height?: number;
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  onOk?: (data: any) => void;
  onCancel?: () => void;
}

// 模态对话框结果
export interface OpenModalResult {
  ok: boolean;
  data?: any;
}

// 配置面板选项
export interface OpenConfigOptions {
  title?: string;
  width?: number;
  height?: number;
  closable?: boolean;
  maskClosable?: boolean;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

// 配置面板结果
export interface OpenConfigResult {
  saved: boolean;
  data?: any;
}

// 环境接口
/** 深色模式 */
export enum DarkMode {
  /** 深色模式 */
  DARK = "dark",
  /** 浅色模式 */
  LIGHT = "light"
}

/** 语言类型 */
export enum Language {
  ZH = "zh",
  EN = 'en'
}

/** 文档模式 */
export enum DocMode {
  /** 可编辑模式 */
  EDITABLE = 'editable',
  /** 只读模式 */
  READONLY = 'readonly'
}

export interface EnvService {
  /** 获取深色模式 */
  get darkMode(): DarkMode;

  /**
   * 深色模式变更监听器
   *
   * @param listener 监听器对象
   */
  onDarkModeChange(listener: (darkMode: DarkMode) => void): void;

  /**
   * 取消深色模式变更监听器
   * 
   * @param listener 监听器对象，取消的监听器对象必须是注册传入的对象
   */
  offDarkModeChange(listener: (darkMode: DarkMode) => void): void;

  /** 获取显示语言 */
  get language(): Language;

  /**
   * 语言变更监听器
   * 
   * @param listener 监听器对象
   */
  onLanguageChange(listener: (language: Language) => void): void;

  /**
   * 取消语言变更监听器
   * 
   * @param listener 监听器对象，取消的监听器对象必须是注册传入的对象
   */
  offLanguageChange(listener: (language: Language) => void): void;

  /** 获取文档模式 */
  get docMode(): DocMode;

  /**
   * 文档模式变更监听器
   * 
   * @param listener 监听器对象
   */
  onDocModeChange(listener: (docMode: DocMode) => void): void;

  /**
   * 文档模式变更监听器
   * 
   * @param listener 监听器对象，取消的监听器对象必须是注册传入的对象
   */
  offDocModeChange(listener: (docMode: DocMode) => void): void;
}

export interface ViewService {
  // 原有接口
  openView: (viewId: string, options?: any) => Promise<void>;
  closeView: (viewId: string) => Promise<void>;
  switchView: (viewId: string) => Promise<void>;
  getCurrentView: () => string | null;
  getViewList: () => string[];
  
  // 新增视图管理接口
  /** 显示toast弹窗 */
  showToast(message: string): Promise<void>;
  /** 打开模态对话框 */
  openModal(options: OpenModalOptions): Promise<OpenModalResult>;
  /** 关闭模态对话框 */
  closeModal(data: any): Promise<void>;
  /** 进入全屏 */
  requestFullscreen(options: any): Promise<void>;
  /** 退出全屏 */
  exitFullscreen(): Promise<void>;
  /** 打开配置面板 */
  openConfig(options: OpenConfigOptions): Promise<OpenConfigResult>;
  /** 关闭配置面板 */
  closeConfig(data: any): Promise<void>;
}

export interface LifeCycleService {
  onMount: (callback: () => void) => () => void;
  onUnmount: (callback: () => void) => () => void;
  onUpdate: (callback: (props: any) => void) => () => void;
  triggerMount: () => void;
  triggerUnmount: () => void;
  triggerUpdate: (props: any) => void;
  /** Block加载完成通知 */
  notifyBlockReady(): void;
}

/** 协同Map */
export interface SharedMap {
  /** 获取值 */
  get(key: string): any;
  /** 设置值 */
  set(key: string, value: any): void;
  /** 删除值 */
  delete(key: string): boolean;
  /** 检查是否存在键 */
  has(key: string): boolean;
  /** 清空Map */
  clear(): void;
  /** 获取所有键 */
  keys(): string[];
  /** 获取所有值 */
  values(): any[];
  /** 获取键值对数量 */
  size(): number;
  /** 监听Map变更 */
  subscribe(callback: (action: 'set' | 'delete' | 'clear', key?: string, value?: any) => void): () => void;
}

/** 协同数组 */
export interface SharedArray {
  /** 获取指定索引的值 */
  get(index: number): any;
  /** 设置指定索引的值 */
  set(index: number, value: any): void;
  /** 添加元素到末尾 */
  push(...items: any[]): number;
  /** 移除并返回最后一个元素 */
  pop(): any;
  /** 添加元素到开头 */
  unshift(...items: any[]): number;
  /** 移除并返回第一个元素 */
  shift(): any;
  /** 在指定位置插入/删除元素 */
  splice(start: number, deleteCount?: number, ...items: any[]): any[];
  /** 获取数组长度 */
  length(): number;
  /** 清空数组 */
  clear(): void;
  /** 监听数组变更 */
  subscribe(callback: (action: 'push' | 'pop' | 'unshift' | 'shift' | 'splice' | 'set' | 'clear', index?: number, value?: any) => void): () => void;
}

export interface SharedData {
  get: <T = any>(key: string) => T | undefined;
  set: <T = any>(key: string, value: T) => void;
  delete: (key: string) => boolean;
  clear: () => void;
  keys: () => string[];
  subscribe: (key: string, callback: (value: any) => void) => () => void;
  /** 获取协同映射对象 */
  getMap(name: string): SharedMap;
  /** 获取协同数组对象 */
  getArray(name: string): SharedArray;
}

export interface BlockContext {
  readonly toolBar: Toolbar;
  readonly viewService: ViewService;
  readonly lifeCycleService: LifeCycleService;
  readonly sharedData: SharedData;
  readonly envService: EnvService;
}

export interface MicroAppProps {
  toolbarAPI?: ToolbarAPI;
  eventBus?: EventBus;
  blockContext?: BlockContext;
  container?: Element | Document;
}

export interface APIProxy {
  addToolBarItem: (item: ToolBarItem) => boolean | Promise<boolean>;
  removeToolBarItem: (id: number | string) => boolean | Promise<boolean>;
  on: <T = any>(event: string, handler: (payload: T) => void) => () => void;
  off: <T = any>(event: string, handler: (payload: T) => void) => void;
  emit: <T = any>(event: string, payload: T) => void;
}

export const INTERFACES: {
  TOOLBAR_API: Record<keyof ToolbarAPI, string>;
  EVENT_BUS: Record<keyof EventBus, string>;
  TOOLBAR: Record<keyof Toolbar, string>;
  VIEW_SERVICE: Record<keyof ViewService, string>;
  LIFE_CYCLE_SERVICE: Record<keyof LifeCycleService, string>;
  SHARED_DATA: Record<keyof SharedData, string>;
};

export const ToolBarItemShape: Record<keyof ToolBarItem, string>;

export function validateAPI(api: any, interfaceName: keyof typeof INTERFACES): boolean;
export function createAPIProxy(props: MicroAppProps): APIProxy;

// BlockContext 类定义
export declare class BlockContext {
  static create(): BlockContext;
  readonly toolBar: Toolbar;
  readonly viewService: ViewService;
  readonly lifeCycleService: LifeCycleService;
  readonly sharedData: SharedData;
}

declare const _default: {
  INTERFACES: typeof INTERFACES;
  ToolBarItemShape: typeof ToolBarItemShape;
  validateAPI: typeof validateAPI;
  createAPIProxy: typeof createAPIProxy;
};

export default _default;


