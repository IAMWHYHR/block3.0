import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';
export interface CollaborationConfig {
    wsUrl: string;
    roomName: string;
    microName: string;
    useHocuspocus?: boolean;
}
export type CollaborationStatus = 'disconnected' | 'connecting' | 'connected';
export interface UserInfo {
    id: string;
    name: string;
    color: string;
    cursor?: any;
}
export interface CollaborationData {
    [key: string]: any;
}
export interface CollaborationListItem {
    id: string;
    [key: string]: any;
}
interface ConnectionInfo {
    id: string;
    config: CollaborationConfig;
    ydoc: Y.Doc;
    provider: HocuspocusProvider | WebsocketProvider;
    awareness: any;
    status: CollaborationStatus;
    isInitialized: boolean;
    isDestroyed: boolean;
    refCount: number;
    lastUsed: number;
}
declare class GlobalCollaborationManager {
    private connections;
    private statusCallbacks;
    private userCallbacks;
    private cleanupInterval;
    constructor();
    private getConnectionId;
    getConnection(config: CollaborationConfig): ConnectionInfo;
    private createConnection;
    private updateConnectionStatus;
    releaseConnection(config: CollaborationConfig): void;
    setUser(config: CollaborationConfig, userInfo: UserInfo): void;
    onStatusChange(config: CollaborationConfig, callback: (status: CollaborationStatus) => void): () => void;
    onUsersChange(config: CollaborationConfig, callback: () => void): () => void;
    getOnlineUsers(config: CollaborationConfig): UserInfo[];
    private startCleanupTask;
    private cleanupInactiveConnections;
    private destroyConnection;
    destroyAll(): void;
}
export declare const globalCollaborationManager: GlobalCollaborationManager;
export declare class CollaborationManager {
    private ydoc;
    private provider;
    private sharedData;
    private listData;
    private awareness;
    private config;
    private status;
    private statusCallbacks;
    private dataCallbacks;
    private listCallbacks;
    private userCallbacks;
    constructor(config: CollaborationConfig);
    private bindEvents;
    private setStatus;
    private notifyDataCallbacks;
    private notifyListCallbacks;
    private notifyUserCallbacks;
    setUser(userInfo: UserInfo): void;
    onStatusChange(callback: (status: CollaborationStatus) => void): () => void;
    onDataChange(callback: () => void): () => void;
    onListChange(callback: () => void): () => void;
    onUsersChange(callback: () => void): () => void;
    updateData(key: string, value: any): void;
    getData(key: string): any;
    getAllData(): CollaborationData;
    addListItem(item: CollaborationListItem): void;
    updateListItem(index: number, item: CollaborationListItem): void;
    removeListItem(index: number): void;
    getListData(): CollaborationListItem[];
    getOnlineUsers(): UserInfo[];
    getStatus(): CollaborationStatus;
    destroy(): void;
    getProvider(): HocuspocusProvider;
    getYDoc(): Y.Doc;
    getSharedData(): Y.Map<any>;
    getListDataInstance(): Y.Array<any>;
}
export {};
