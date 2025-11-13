import { Extension } from '@tiptap/core'
import type { DecorationAttrs } from '@tiptap/pm/view'
import * as YPM from '../y-prosemirror'

const { defaultSelectionBuilder } = YPM

type CollaborationCursorStorage = {
  users: { clientId: number, [key: string]: any }[],
}

export interface CollaborationCursorOptions {
  provider: any,
  user: Record<string, any>,
  render (user: Record<string, any>): HTMLElement,
  selectionRender (user: Record<string, any>): DecorationAttrs
  onUpdate: (users: { clientId: number, [key: string]: any }[]) => null,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collaborationCursor: {
      updateUser: (attributes: Record<string, any>) => ReturnType,
      user: (attributes: Record<string, any>) => ReturnType,
    }
  }
}

const awarenessStatesToArray = (states: Map<number, Record<string, any>>) => {
  return Array.from(states.entries()).map(([key, value]) => {
    return {
      clientId: key,
      ...value.user,
    }
  })
}

const defaultOnUpdate = () => null

export const CollaborationCursor = Extension.create<CollaborationCursorOptions, CollaborationCursorStorage>({
  name: 'collaborationCursor',

  priority: 999,

  addOptions() {
    return {
      provider: null,
      user: {
        name: null,
        color: null,
      },
      render: user => {
        const cursor = document.createElement('span')

        cursor.classList.add('collaboration-cursor__caret')
        cursor.setAttribute('style', `border-color: ${user.color}`)

        const label = document.createElement('div')

        label.classList.add('collaboration-cursor__label')
        label.setAttribute('style', `background-color: ${user.color}`)
        label.insertBefore(document.createTextNode(user.name), null)
        cursor.insertBefore(label, null)

        return cursor
      },
      selectionRender: defaultSelectionBuilder as any,
      onUpdate: defaultOnUpdate,
    }
  },

  onCreate() {
    if (this.options.onUpdate !== defaultOnUpdate) {
      console.warn('[tiptap warn]: DEPRECATED: The "onUpdate" option is deprecated. Please use `editor.storage.collaborationCursor.users` instead. Read more: https://tiptap.dev/api/extensions/collaboration-cursor')
    }
    if (!this.options.provider) {
      throw new Error('The "provider" option is required for the CollaborationCursor extension')
    }
    if (!this.options.provider.awareness) {
      throw new Error('The provider must have an awareness instance for the CollaborationCursor extension')
    }
  },

  addStorage() {
    return {
      users: [],
    }
  },

  addCommands() {
    return {
      updateUser: attributes => () => {
        this.options.user = attributes

        if (this.options.provider.awareness) {
          this.options.provider.awareness.setLocalStateField('user', this.options.user)
        }

        return true
      },
      user: attributes => ({ editor }) => {
        console.warn('[tiptap warn]: DEPRECATED: The "user" command is deprecated. Please use "updateUser" instead. Read more: https://tiptap.dev/api/extensions/collaboration-cursor')

        return editor.commands.updateUser(attributes)
      },
    }
  },

  addProseMirrorPlugins() {
    if (!this.options.provider.awareness) {
      return []
    }

    return [
      (YPM as any).yCursorPlugin(
        (() => {
          const awareness = this.options.provider.awareness!
          awareness.setLocalStateField('user', this.options.user)

          this.storage.users = awarenessStatesToArray(awareness.getStates())

          awareness.on('update', () => {
            this.storage.users = awarenessStatesToArray(awareness.getStates())
          })

          return awareness
        })(),
        // @ts-ignore
        {
          cursorBuilder: this.options.render,
          selectionBuilder: this.options.selectionRender ?? (YPM as any).defaultSelectionBuilder,
        },
      ),
    ]
  },
})


