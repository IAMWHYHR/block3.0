// 导出React Editor组件
export { Editor as ReactEditor } from './editor/Editor';
export type { EditorProps } from './editor/Editor';

// 导出SkeletonNode相关
export { SkeletonNode } from './sketetonNode/skeletonNode';
export type { SkeletonNodeAttributes } from './sketetonNode/skeletonNode';

// 导出协同相关
export { CollaborationManager } from './collaboration/collaboration';
export type { 
  CollaborationConfig, 
  UserInfo, 
  CollaborationStatus 
} from './collaboration/collaboration';

// 导出编辑器协同相关
export { 
  EditorCollaborationManager,
  createEditorCollaboration,
  getDefaultEditorCollaboration,
  setDefaultEditorCollaboration,
  destroyDefaultEditorCollaboration
} from './collaboration/editorCollaboration';
export type { 
  EditorCollaborationConfig, 
  EditorUserInfo, 
  EditorCollaborationStatus 
} from './collaboration/editorCollaboration';
