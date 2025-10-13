import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SkeletonNodeView from './wrapper/SkeletonNodeView';
export const SkeletonNode = Node.create({
    name: 'skeletonNode',
    group: 'block',
    content: 'block*',
    atom: true,
    onCreate() {
        console.log('🎉 SkeletonNode 被创建了!');
    },
    onDestroy() {
        console.log('💀 SkeletonNode 被销毁了!');
    },
    addAttributes() {
        return {
            microName: {
                default: '',
                parseHTML: element => element.getAttribute('data-micro-name'),
                renderHTML: attributes => {
                    if (!attributes.microName) {
                        return {};
                    }
                    return {
                        'data-micro-name': attributes.microName,
                    };
                },
            },
            wsUrl: {
                default: '',
                parseHTML: element => element.getAttribute('data-ws-url'),
                renderHTML: attributes => {
                    if (!attributes.wsUrl) {
                        return {};
                    }
                    return {
                        'data-ws-url': attributes.wsUrl,
                    };
                },
            },
            width: {
                default: '100%',
                parseHTML: element => element.getAttribute('data-width'),
                renderHTML: attributes => {
                    if (!attributes.width) {
                        return {};
                    }
                    return {
                        'data-width': attributes.width,
                    };
                },
            },
            height: {
                default: '200px',
                parseHTML: element => element.getAttribute('data-height'),
                renderHTML: attributes => {
                    if (!attributes.height) {
                        return {};
                    }
                    return {
                        'data-height': attributes.height,
                    };
                },
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'div[data-type="skeleton-node"]',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'skeleton-node',
                class: 'skeleton-node-container',
            }),
            0,
        ];
    },
    addNodeView() {
        console.log('🔧 SkeletonNode addNodeView 被调用');
        return ReactNodeViewRenderer(SkeletonNodeView, {
            as: 'div',
            className: 'skeleton-node-wrapper'
        });
    },
    addCommands() {
        return {
            setSkeletonNode: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: attributes,
                });
            },
        };
    },
});
