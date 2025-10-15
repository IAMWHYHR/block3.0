import React from 'react';
import { EditorUserInfo, EditorCollaborationStatus } from '../collaboration/editorCollaboration';
export interface EditorProps {
    microName: string;
    wsUrl: string;
    roomName?: string;
    enableCollaboration?: boolean;
    useHocuspocus?: boolean;
    userInfo?: Partial<EditorUserInfo>;
    placeholder?: string;
    onEditorReady?: (editor: any) => void;
    onCollaborationStatusChange?: (status: EditorCollaborationStatus) => void;
    onUsersChange?: (users: EditorUserInfo[]) => void;
    onUpdate?: (html: string) => void;
}
export declare const Editor: React.FC<EditorProps>;
export default Editor;
