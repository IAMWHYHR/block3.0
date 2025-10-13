import { Node } from '@tiptap/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
export interface SkeletonNodeAttributes {
    microName: string;
    wsUrl: string;
}
export interface SkeletonNodeOptions {
    microName: string;
    wsUrl: string;
    ydoc: Y.Doc;
    provider: WebsocketProvider;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        skeletonNode: {
            setSkeletonNode: (attributes: SkeletonNodeAttributes) => ReturnType;
        };
    }
}
export declare const SkeletonNode: Node<SkeletonNodeOptions, any>;
