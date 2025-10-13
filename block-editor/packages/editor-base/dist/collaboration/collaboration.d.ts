import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
export interface CollaborationConfig {
    wsUrl: string;
    roomName: string;
    microName: string;
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
