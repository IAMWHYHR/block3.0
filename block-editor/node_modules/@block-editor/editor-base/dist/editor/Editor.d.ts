import React from 'react';
import { EditorUserInfo } from '../collaboration/editorCollaboration';
export interface EditorProps {
    microName: string;
    wsUrl: string;
    roomName?: string;
    enableCollaboration?: boolean;
    useHocuspocus?: boolean;
    userInfo?: Partial<EditorUserInfo>;
    placeholder?: string;
    onUpdate?: (html: string) => void;
}
export declare const Editor: React.FC<EditorProps>;
export default Editor;
