import { 
  createToolbarService, 
  createViewService, 
  createEnvService, 
  createLifeCycleService, 
  createSharedDataService,
  createEventBus
} from './BlockContextServices.js';

// BlockContext 类
export class BlockContext {
  constructor(toolBar, viewService, lifeCycleService, sharedData, envService, eventBus) {
    this.toolBar = toolBar;
    this.viewService = viewService;
    this.lifeCycleService = lifeCycleService;
    this.sharedData = sharedData;
    this.envService = envService;
    this.eventBus = eventBus;
  }

  static create(toolBar, viewService, lifeCycleService, sharedData, envService, eventBus) {
    return new BlockContext(toolBar, viewService, lifeCycleService, sharedData, envService, eventBus);
  }

  // 获取工具栏服务
  get toolBar() {
    return this._toolBar;
  }

  set toolBar(value) {
    this._toolBar = value;
  }

  // 获取视图服务
  get viewService() {
    return this._viewService;
  }

  set viewService(value) {
    this._viewService = value;
  }

  // 获取生命周期服务
  get lifeCycleService() {
    return this._lifeCycleService;
  }

  set lifeCycleService(value) {
    this._lifeCycleService = value;
  }

  // 获取共享数据服务
  get sharedData() {
    return this._sharedData;
  }

  set sharedData(value) {
    this._sharedData = value;
  }

  // 获取环境服务
  get envService() {
    return this._envService;
  }

  set envService(value) {
    this._envService = value;
  }

  // 获取事件总线
  get eventBus() {
    return this._eventBus;
  }

  set eventBus(value) {
    this._eventBus = value;
  }
}

// 创建默认的BlockContext实例
export const createDefaultBlockContext = () => {
  const toolBar = createToolbarService();
  const viewService = createViewService();
  const envService = createEnvService();
  const lifeCycleService = createLifeCycleService();
  const sharedData = createSharedDataService();
  const eventBus = createEventBus();

  return BlockContext.create(toolBar, viewService, lifeCycleService, sharedData, envService, eventBus);
};

export default BlockContext;




