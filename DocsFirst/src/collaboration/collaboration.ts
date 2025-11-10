import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import * as YPM from '../y-prosemirror'
import { Doc, UndoManager, XmlFragment } from 'yjs'

type YSyncOpts = any;
type YUndoOpts = any;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collaboration: {
      undo: () => ReturnType;
      redo: () => ReturnType;
    };
  }
}

export interface CollaborationStorage {
  isDisabled: boolean;
}

export interface CollaborationOptions {
  document?: Doc | null;
  field?: string;
  fragment?: XmlFragment | null;
  onFirstRender?: () => void;
  ySyncOptions?: YSyncOpts;
  yUndoOptions?: YUndoOpts;
}

export const Collaboration = Extension.create<CollaborationOptions, CollaborationStorage>({
  name: 'collaboration',

  priority: 1000,

  addOptions() {
    return {
      document: null,
      field: 'default',
      fragment: null,
    }
  },

  addStorage() {
    return {
      isDisabled: false,
    }
  },

  onCreate() {
    if (this.editor.extensionManager.extensions.find(extension => extension.name === 'history')) {
      console.warn(
        '[tiptap warn]: "@tiptap/extension-collaboration" comes with its own history support and is not compatible with "@tiptap/extension-history".',
      )
    }
  },

  addCommands() {
    return {
      undo:
        () => ({ tr, state, dispatch }) => {
          tr.setMeta('preventDispatch', true)

          const undoManager: UndoManager = (YPM as any).yUndoPluginKey.getState(state).undoManager

          if (undoManager.undoStack.length === 0) {
            return false
          }

          if (!dispatch) {
            return true
          }

          return (YPM as any).undo(state)
        },
      redo:
        () => ({ tr, state, dispatch }) => {
          tr.setMeta('preventDispatch', true)

          const undoManager: UndoManager = (YPM as any).yUndoPluginKey.getState(state).undoManager

          if (undoManager.redoStack.length === 0) {
            return false
          }

          if (!dispatch) {
            return true
          }

          return (YPM as any).redo(state)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-z': () => this.editor.commands.undo(),
      'Mod-y': () => this.editor.commands.redo(),
      'Shift-Mod-z': () => this.editor.commands.redo(),
    }
  },

  addProseMirrorPlugins() {
    const fragment = this.options.fragment
      ? this.options.fragment
      : (this.options.document as Doc).getXmlFragment(this.options.field)

    const yUndoPluginInstance = (YPM as any).yUndoPlugin(this.options.yUndoOptions)
    const originalUndoPluginView = yUndoPluginInstance.spec.view

    yUndoPluginInstance.spec.view = (view: EditorView) => {
      const { undoManager } = (YPM as any).yUndoPluginKey.getState(view.state)

      if (undoManager.restore) {
        undoManager.restore()
        undoManager.restore = () => {
          // noop
        }
      }

      const viewRet = originalUndoPluginView ? originalUndoPluginView(view) : undefined

      return {
        destroy: () => {
          const hasUndoManSelf = undoManager.trackedOrigins.has(undoManager)
          // eslint-disable-next-line no-underscore-dangle
          const observers = undoManager._observers

          undoManager.restore = () => {
            if (hasUndoManSelf) {
              undoManager.trackedOrigins.add(undoManager)
            }

            undoManager.doc.on('afterTransaction', undoManager.afterTransactionHandler)
            // eslint-disable-next-line no-underscore-dangle
            undoManager._observers = observers
          }

          if (viewRet?.destroy) {
            viewRet.destroy()
          }
        },
      }
    }

    const ySyncPluginOptions: YSyncOpts = {
      ...this.options.ySyncOptions,
      onFirstRender: this.options.onFirstRender,
    }

    const ySyncPluginInstance = (YPM as any).ySyncPlugin(fragment, ySyncPluginOptions)

    if (this.editor.options.enableContentCheck) {
      fragment.doc?.on('beforeTransaction', () => {
        try {
          const jsonContent = ((YPM as any).yXmlFragmentToProsemirrorJSON(fragment))

          if (jsonContent.content.length === 0) {
            return
          }

          this.editor.schema.nodeFromJSON(jsonContent).check()
        } catch (error) {
          this.editor.emit('contentError', {
            error: error as Error,
            editor: this.editor,
            disableCollaboration: () => {
              fragment.doc?.destroy()
              this.storage.isDisabled = true
            },
          })
          return false
        }
      })
    }

    return [
      ySyncPluginInstance,
      yUndoPluginInstance,
      this.editor.options.enableContentCheck
        && new Plugin({
          key: new PluginKey('filterInvalidContent'),
          filterTransaction: () => {
            if (this.storage.isDisabled) {
              fragment.doc?.destroy()

              return true
            }

            return true
          },
        }),
    ].filter(Boolean)
  },
})


