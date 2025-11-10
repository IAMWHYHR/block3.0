// Typed facade for JS implementation
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as impl from './y-prosemirror.js'

// Only export what we need to keep surface minimal
export const ySyncPlugin: any = (impl as any).ySyncPlugin
export const yUndoPlugin: any = (impl as any).yUndoPlugin
export const yUndoPluginKey: any = (impl as any).yUndoPluginKey
export const redo: any = (impl as any).redo
export const undo: any = (impl as any).undo
export const yXmlFragmentToProsemirrorJSON: any = (impl as any).yXmlFragmentToProsemirrorJSON
export const yCursorPlugin: any = (impl as any).yCursorPlugin
export const defaultSelectionBuilder: any = (impl as any).defaultSelectionBuilder



