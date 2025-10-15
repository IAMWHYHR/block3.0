interface Toolbar {
    addItem(item: any): boolean | Promise<boolean>;
    removeItem(id: number | string): boolean | Promise<boolean>;
    getItems(): any[];
    getValidItems(): any[];
    insertBefore(items: any[], code: string | null): this;
    appendItems(items: any[]): this;
    deleteItems(codes: string[]): this;
    modifyItem(code: string, props: any): this;
}
interface ViewService {
    openView(viewId: string, options?: any): Promise<void>;
    closeView(viewId: string): Promise<void>;
    switchView(viewId: string): Promise<void>;
    getCurrentView(): string | null;
    getViewList(): string[];
    showToast(message: string): Promise<void>;
    openModal(options: any): Promise<any>;
    closeModal(data: any): Promise<void>;
    requestFullscreen(options: any): Promise<void>;
    exitFullscreen(): Promise<void>;
    openConfig(options: any): Promise<any>;
    closeConfig(data: any): Promise<void>;
}
interface LifeCycleService {
    onMount(callback: () => void): () => void;
    onUnmount(callback: () => void): () => void;
    onUpdate(callback: (props: any) => void): () => void;
    triggerMount(): void;
    triggerUnmount(): void;
    triggerUpdate(props: any): void;
    notifyBlockReady(): void;
}
interface SharedData {
    get<T = any>(key: string): T | undefined;
    set<T = any>(key: string, value: T): void;
    delete(key: string): boolean;
    clear(): void;
    keys(): string[];
    subscribe(key: string, callback: (value: any) => void): () => void;
    getMap(name: string): any;
    getArray(name: string): any;
}
interface EnvService {
    get darkMode(): string;
    onDarkModeChange(listener: (darkMode: string) => void): void;
    offDarkModeChange(listener: (darkMode: string) => void): void;
    get language(): string;
    onLanguageChange(listener: (language: string) => void): void;
    offLanguageChange(listener: (language: string) => void): void;
    get docMode(): string;
    onDocModeChange(listener: (docMode: string) => void): void;
    offDocModeChange(listener: (docMode: string) => void): void;
}
interface BlockContext {
    readonly toolBar: Toolbar;
    readonly viewService: ViewService;
    readonly lifeCycleService: LifeCycleService;
    readonly sharedData: SharedData;
    readonly envService: EnvService;
}
/**
 * BlockContext实现类
 */
export declare class BlockContextServiceImpl implements BlockContext {
    readonly toolBar: Toolbar;
    readonly viewService: ViewService;
    readonly lifeCycleService: LifeCycleService;
    readonly sharedData: SharedData;
    readonly envService: EnvService;
    constructor(collaborationConnection?: any);
    /**
     * 设置协同连接
     */
    setCollaborationConnection(connection: any): void;
    static create(collaborationConnection?: any): BlockContext;
}
/**
 * 创建BlockContext实例
 */
export declare function createBlockContext(collaborationConnection?: any): BlockContext;
export {};
