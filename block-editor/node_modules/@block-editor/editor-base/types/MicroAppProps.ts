// 临时定义基础接口，避免依赖shared-sdk
interface BaseMicroAppProps {
  toolbarAPI?: any;
  eventBus?: any;
  blockContext?: any;
  container?: Element | Document;
}

// 协同状态类型
export type CollaborationStatus = 'disconnected' | 'connecting' | 'connected';

// 用户信息接口
export interface UserInfo {
  id: string;
  name: string;
  color: string;
  cursor?: any;
}

// 协同数据接口
export interface CollaborationData {
  [key: string]: any;
}

// 协同列表项接口
export interface CollaborationListItem {
  id: string;
  [key: string]: any;
}

// 协同配置接口
export interface CollaborationConfig {
  wsUrl: string;
  roomName: string;
  microName: string;
  useHocuspocus?: boolean;
}

// 协同服务接口
export interface CollaborationService {
  // 状态管理
  getStatus(): CollaborationStatus;
  onStatusChange(callback: (status: CollaborationStatus) => void): () => void;
  
  // 用户管理
  setUser(userInfo: UserInfo): void;
  getOnlineUsers(): UserInfo[];
  onUsersChange(callback: () => void): () => void;
  
  // 数据管理
  updateData(key: string, value: any): void;
  getData(key: string): any;
  getAllData(): CollaborationData;
  
  // 列表管理
  addListItem(item: CollaborationListItem): void;
  updateListItem(index: number, item: CollaborationListItem): void;
  removeListItem(index: number): void;
  getListData(): CollaborationListItem[];
  
  // 实时数据获取
  getRealTimeData(): CollaborationData;
  getRealTimeListData(): CollaborationListItem[];
  
  // 调试信息
  getDebugInfo(): any;
}

// 扩展的微应用Props接口
export interface MicroAppProps extends BaseMicroAppProps {
  // 协同相关
  collaborationService?: CollaborationService;
  collaborationStatus?: CollaborationStatus;
  onlineUsers?: UserInfo[];
  
  // 微应用标识
  microName?: string;
  wsUrl?: string;
  
  // 容器信息
  container?: Element | Document;
  
  // 调试信息
  debugInfo?: any;
}

// 金字塔微应用特定的Props
export interface PyramidMicroAppProps extends MicroAppProps {
  // 金字塔特定数据
  pyramidData?: CollaborationData;
  pyramidListData?: CollaborationListItem[];
  
  // 金字塔特定方法
  updatePyramidData?: (key: string, value: any) => void;
  getPyramidData?: (key: string) => any;
  addPyramidToList?: (item: any) => void;
  updatePyramidInList?: (index: number, item: any) => void;
  removePyramidFromList?: (index: number) => void;
  setPyramidUser?: (userInfo: any) => void;
  
  // 金字塔特定协同对象
  pyramidProvider?: any;
  pyramidSharedData?: any;
  pyramidList?: any;
  pyramidYdoc?: any;
}
