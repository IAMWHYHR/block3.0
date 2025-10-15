interface BaseMicroAppProps {
    toolbarAPI?: any;
    eventBus?: any;
    blockContext?: any;
    container?: Element | Document;
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
export interface CollaborationConfig {
    wsUrl: string;
    roomName: string;
    microName: string;
    useHocuspocus?: boolean;
}
export interface CollaborationService {
    getStatus(): CollaborationStatus;
    onStatusChange(callback: (status: CollaborationStatus) => void): () => void;
    setUser(userInfo: UserInfo): void;
    getOnlineUsers(): UserInfo[];
    onUsersChange(callback: () => void): () => void;
    updateData(key: string, value: any): void;
    getData(key: string): any;
    getAllData(): CollaborationData;
    addListItem(item: CollaborationListItem): void;
    updateListItem(index: number, item: CollaborationListItem): void;
    removeListItem(index: number): void;
    getListData(): CollaborationListItem[];
    getRealTimeData(): CollaborationData;
    getRealTimeListData(): CollaborationListItem[];
    getDebugInfo(): any;
}
export interface MicroAppProps extends BaseMicroAppProps {
    collaborationService?: CollaborationService;
    collaborationStatus?: CollaborationStatus;
    onlineUsers?: UserInfo[];
    microName?: string;
    wsUrl?: string;
    container?: Element | Document;
    debugInfo?: any;
}
export interface PyramidMicroAppProps extends MicroAppProps {
    pyramidData?: CollaborationData;
    pyramidListData?: CollaborationListItem[];
    updatePyramidData?: (key: string, value: any) => void;
    getPyramidData?: (key: string) => any;
    addPyramidToList?: (item: any) => void;
    updatePyramidInList?: (index: number, item: any) => void;
    removePyramidFromList?: (index: number) => void;
    setPyramidUser?: (userInfo: any) => void;
    pyramidProvider?: any;
    pyramidSharedData?: any;
    pyramidList?: any;
    pyramidYdoc?: any;
}
export {};
