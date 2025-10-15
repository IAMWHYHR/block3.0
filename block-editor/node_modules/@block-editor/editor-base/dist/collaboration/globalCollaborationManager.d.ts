import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';
import { EditorCollaborationConfig, EditorCollaborationStatus, EditorUserInfo } from './editorCollaboration';
interface ConnectionInfo {
    id: string;
    config: EditorCollaborationConfig;
    ydoc: Y.Doc;
    provider: HocuspocusProvider | WebsocketProvider;
    awareness: any;
    status: EditorCollaborationStatus;
    isInitialized: boolean;
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
    getConnection(config: EditorCollaborationConfig): ConnectionInfo;
    private createConnection;
    releaseConnection(config: EditorCollaborationConfig): void;
    private updateConnectionStatus;
    onStatusChange(config: EditorCollaborationConfig, callback: (status: EditorCollaborationStatus) => void): () => void;
    onUsersChange(config: EditorCollaborationConfig, callback: () => void): () => void;
    getOnlineUsers(config: EditorCollaborationConfig): EditorUserInfo[];
    setUser(config: EditorCollaborationConfig, userInfo: Partial<EditorUserInfo>): void;
    private startCleanupTask;
    private cleanupInactiveConnections;
    private destroyConnection;
    getConnectionStatus(config: EditorCollaborationConfig): EditorCollaborationStatus;
    hasConnection(config: EditorCollaborationConfig): boolean;
    getAllConnections(): ConnectionInfo[];
    destroyAll(): void;
}
declare const globalCollaborationManager: GlobalCollaborationManager;
export { globalCollaborationManager, GlobalCollaborationManager };
export type { ConnectionInfo };
