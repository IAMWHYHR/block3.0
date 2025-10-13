import React from 'react';
export interface EditorProps {
    microName: string;
    wsUrl: string;
    onEditorReady?: (editor: any) => void;
}
export declare const Editor: React.FC<EditorProps>;
export default Editor;
