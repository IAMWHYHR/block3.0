import * as Y from 'yjs'

export interface MultiDocUndoManagerOpts {
  trackedOrigins?: Set<any> | any[]
  deleteFilter?: (item: Y.Item) => boolean
  captureTransaction?: (tr: Y.Transaction) => boolean
}

/**
 * 一个简单的多文档 UndoManager，实现思路：
 * - 使用单个 Y.UndoManager 作为核心实例；
 * - 将主文档的所有 share 类型、以及所有子文档的默认 fragment 一起加入 scope；
 * - 监听主文档的 subdocs 事件，动态增删子文档的 scope，保证后续创建/移除的子文档也能被撤销/重做管理。
 *
 * 这不是对 y-utility/y-multidoc-undomanager.js 的逐行翻译，但提供了同样的能力：在一组文档上维护统一的 undo/redo 栈。
 */
export class YMultiDocUndoManager {
  private core: Y.UndoManager
  private trackedTypes: Set<Y.AbstractType<any>> = new Set()
  private docTypeMap: Map<Y.Doc, Set<Y.AbstractType<any>>> = new Map()
  private masterDoc: Y.Doc
  private handleSubdocsBound: (e: { added: Set<Y.Doc>; removed: Set<Y.Doc> }) => void

  get undoStack() {
    return this.core.undoStack
  }

  get redoStack() {
    return this.core.redoStack
  }

  constructor(masterDoc: Y.Doc, opts: MultiDocUndoManagerOpts = {}) {
    this.masterDoc = masterDoc

    // 收集主文档 + 已有子文档的 tracked types
    const initialTypes = this.collectDocTypes(masterDoc)
    masterDoc.subdocs.forEach((subdoc) => {
      this.collectDocTypes(subdoc).forEach((t) => initialTypes.push(t))
    })

    // 初始化 UndoManager
    const trackedOrigins =
      opts.trackedOrigins == null
        ? undefined
        : opts.trackedOrigins instanceof Set
          ? opts.trackedOrigins
          : new Set(opts.trackedOrigins)

    this.core = new Y.UndoManager(initialTypes, {
      trackedOrigins,
      deleteFilter: opts.deleteFilter,
      captureTransaction: opts.captureTransaction,
    })

    // 监听 subdocs 变化，动态增删 scope
    this.handleSubdocsBound = this.handleSubdocs.bind(this)
    masterDoc.on('subdocs', this.handleSubdocsBound)
  }

  /**
   * 收集某个 doc 中需要被追踪的类型：
   * - doc.share 中的所有类型
   * - 默认的 XmlFragment('default')，便于子文档只有一个 fragment 的场景
   */
  private collectDocTypes(doc: Y.Doc): Y.AbstractType<any>[] {
    const types: Y.AbstractType<any>[] = []

    // doc.share 里的类型
    doc.share.forEach((val) => {
      if (val instanceof Y.AbstractType) {
        types.push(val)
      }
    })

    // 默认 fragment（如果存在）
    try {
      const frag = doc.getXmlFragment('default')
      if (frag) {
        types.push(frag)
      }
    } catch {
      // ignore
    }

    // 记录映射，便于后续 remove scope
    const set = new Set(types)
    this.docTypeMap.set(doc, set)
    types.forEach((t) => this.trackedTypes.add(t))
    return types
  }

  private handleSubdocs(event: { added: Set<Y.Doc>; removed: Set<Y.Doc> }) {
    // 新增子文档：收集类型并加入 scope
    event.added.forEach((subdoc) => {
      const types = this.collectDocTypes(subdoc)
      if (types.length > 0) {
        this.core.addToScope(types)
      }
    })

    // 移除子文档：从 scope 删除对应类型
    event.removed.forEach((subdoc) => {
      const types = this.docTypeMap.get(subdoc)
      if (types && types.size > 0) {
        const toRemove = Array.from(types)
        const coreAny = this.core as any
        if (typeof coreAny.removeFromScope === 'function') {
          coreAny.removeFromScope(toRemove)
        } else if (Array.isArray((coreAny as any).scope)) {
          // 兼容老版本类型定义：scope 可能是数组/Set
          const scope = (coreAny as any).scope
          toRemove.forEach((t) => {
            if (scope instanceof Set) {
              scope.delete(t)
            } else if (Array.isArray(scope)) {
              const idx = scope.indexOf(t)
              if (idx >= 0) scope.splice(idx, 1)
            }
          })
        }
      }
      this.docTypeMap.delete(subdoc)
    })
  }

  undo() {
    return this.core.undo()
  }

  redo() {
    return this.core.redo()
  }

  canUndo() {
    return this.core.undoStack.length > 0
  }

  canRedo() {
    return this.core.redoStack.length > 0
  }

  clear() {
    this.core.clear()
  }

  destroy() {
    this.masterDoc.off('subdocs', this.handleSubdocsBound)
    this.core.destroy()
    this.docTypeMap.clear()
    this.trackedTypes.clear()
  }

  on(event: string, cb: any) {
    // 透传 core 的事件（stack-item-added / stack-item-popped 等）
    // @ts-ignore
    this.core.on(event, cb)
    return this
  }
}

export default YMultiDocUndoManager

