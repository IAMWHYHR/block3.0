import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';
export interface EditorCollaborationConfig {
    wsUrl: string;
    roomName: string;
    microName: string;
    useHocuspocus?: boolean;
}
export type EditorCollaborationStatus = 'disconnected' | 'connecting' | 'connected';
export interface EditorUserInfo {
    id: string;
    name: string;
    color: string;
    cursor?: any;
}
export type CollaborationProvider = HocuspocusProvider | WebsocketProvider;
export declare class EditorCollaborationManager {
    private ydoc;
    private provider;
    private awareness;
    private config;
    private status;
    private statusCallbacks;
    private userCallbacks;
    private isHocuspocus;
    private _isInitialized;
    private _isDestroyed;
    constructor(config: EditorCollaborationConfig);
    private bindEvents;
    private setStatus;
    private notifyUserCallbacks;
    setUser(userInfo: Partial<EditorUserInfo>): void;
    onStatusChange(callback: (status: EditorCollaborationStatus) => void): () => void;
    onUsersChange(callback: () => void): () => void;
    getOnlineUsers(): EditorUserInfo[];
    getStatus(): EditorCollaborationStatus;
    destroy(): void;
    private performDestroy;
    getProvider(): CollaborationProvider;
    getYDoc(): Y.Doc;
    getAwareness(): any;
    isUsingHocuspocus(): boolean;
    isInitialized(): boolean;
    isDestroyed(): boolean;
}
export declare const createEditorCollaboration: (config: EditorCollaborationConfig) => EditorCollaborationManager;
export declare const getDefaultEditorCollaboration: () => EditorCollaborationManager | null;
export declare const setDefaultEditorCollaboration: (manager: EditorCollaborationManager) => void;
export declare const destroyDefaultEditorCollaboration: () => void;
