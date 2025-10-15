import { CollaborationStatus, UserInfo, CollaborationData, CollaborationListItem, CollaborationConfig } from '../types/MicroAppProps';
/**
 * 协同服务实现类
 * 按照SharedSDK接口规范封装协同功能
 */
export declare class CollaborationService implements CollaborationService {
    private config;
    private connectionRef;
    private statusCallbacks;
    private userCallbacks;
    constructor(config: CollaborationConfig);
    /**
     * 初始化协同连接
     */
    private initializeConnection;
    /**
     * 获取协同状态
     */
    getStatus(): CollaborationStatus;
    /**
     * 监听状态变化
     */
    onStatusChange(callback: (status: CollaborationStatus) => void): () => void;
    /**
     * 设置用户信息
     */
    setUser(userInfo: UserInfo): void;
    /**
     * 获取在线用户
     */
    getOnlineUsers(): UserInfo[];
    /**
     * 监听用户变化
     */
    onUsersChange(callback: () => void): () => void;
    /**
     * 更新数据
     */
    updateData(key: string, value: any): void;
    /**
     * 获取数据
     */
    getData(key: string): any;
    /**
     * 获取所有数据
     */
    getAllData(): CollaborationData;
    /**
     * 添加列表项
     */
    addListItem(item: CollaborationListItem): void;
    /**
     * 更新列表项
     */
    updateListItem(index: number, item: CollaborationListItem): void;
    /**
     * 删除列表项
     */
    removeListItem(index: number): void;
    /**
     * 获取列表数据
     */
    getListData(): CollaborationListItem[];
    /**
     * 获取实时数据
     */
    getRealTimeData(): CollaborationData;
    /**
     * 获取实时列表数据
     */
    getRealTimeListData(): CollaborationListItem[];
    /**
     * 获取调试信息
     */
    getDebugInfo(): any;
    /**
     * 释放连接引用
     */
    releaseConnection(): void;
}
/**
 * 创建协同服务实例
 */
export declare function createCollaborationService(config: CollaborationConfig): CollaborationService;
