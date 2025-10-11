import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SkeletonNodeView from '../components/SkeletonNodeView';

export const SkeletonNode = Node.create({
  name: 'skeleton',
  
  group: 'block',
  
  atom: true,
  
  addAttributes() {
    return {
      microAppName: {
        default: '',
        parseHTML: element => element.getAttribute('data-micro-app'),
        renderHTML: attributes => {
          if (!attributes.microAppName) {
            return {};
          }
          return {
            'data-micro-app': attributes.microAppName,
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
        default: '300px',
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
        tag: 'div[data-type="skeleton"]',
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'skeleton' })];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(SkeletonNodeView, {
      contentDOMElementTag: 'div',
    });
  },
  
  addCommands() {
    return {
      setSkeleton: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },
});
