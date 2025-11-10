/**
 * @module bindings/prosemirror
 */

import { createMutex } from 'lib0/mutex'
import * as PModel from 'prosemirror-model'
import { AllSelection, Plugin, TextSelection, NodeSelection } from "prosemirror-state"; // eslint-disable-line
import * as math from 'lib0/math'
import * as object from 'lib0/object'
import * as set from 'lib0/set'
import { simpleDiff } from 'lib0/diff'
import * as error from 'lib0/error'
import { ySyncPluginKey, yUndoPluginKey } from './keys.js'
import * as Y from 'yjs'
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition
} from '../lib.js'
import * as random from 'lib0/random'
import * as environment from 'lib0/environment'
import * as dom from 'lib0/dom'
import * as eventloop from 'lib0/eventloop'
import * as map from 'lib0/map'
import * as utils from '../utils.js'

export const createEmptyMeta = () => ({
  mapping: new Map(),
  isOMark: new Map()
})

export const isVisible = (item, snapshot) =>
  snapshot === undefined
    ? !item.deleted
    : (snapshot.sv.has(item.id.client) && /** @type {number} */
      (snapshot.sv.get(item.id.client)) > item.id.clock &&
      !Y.isDeleted(snapshot.ds, item.id))

export const ySyncPlugin = (yXmlFragment, {
  colors = [{ light: '#ecd44433', dark: '#ecd444' }],
  colorMapping = new Map(),
  permanentUserData = null,
  onFirstRender = () => {},
  mapping
} = {}) => {
  let initialContentChanged = false
  const binding = new ProsemirrorBinding(yXmlFragment, mapping)
  const plugin = new Plugin({
    props: {
      editable: (state) => {
        const syncState = ySyncPluginKey.getState(state)
        return syncState.snapshot == null && syncState.prevSnapshot == null
      }
    },
    key: ySyncPluginKey,
    state: {
      init: (_initargs, _state) => {
        return {
          type: yXmlFragment,
          doc: yXmlFragment.doc,
          binding,
          snapshot: null,
          prevSnapshot: null,
          isChangeOrigin: false,
          isUndoRedoOperation: false,
          addToHistory: true,
          colors,
          colorMapping,
          permanentUserData
        }
      },
      apply: (tr, pluginState) => {
        const change = tr.getMeta(ySyncPluginKey)
        if (change !== undefined) {
          pluginState = Object.assign({}, pluginState)
          for (const key in change) {
            pluginState[key] = change[key]
          }
        }
        pluginState.addToHistory = tr.getMeta('addToHistory') !== false
        pluginState.isChangeOrigin = change !== undefined &&
          !!change.isChangeOrigin
        pluginState.isUndoRedoOperation = change !== undefined && !!change.isChangeOrigin && !!change.isUndoRedoOperation
        if (binding.prosemirrorView !== null) {
          if (
            change !== undefined &&
            (change.snapshot != null || change.prevSnapshot != null)
          ) {
            eventloop.timeout(0, () => {
              if (binding.prosemirrorView == null) {
                return
              }
              if (change.restore == null) {
                binding._renderSnapshot(
                  change.snapshot,
                  change.prevSnapshot,
                  pluginState
                )
              } else {
                binding._renderSnapshot(
                  change.snapshot,
                  change.snapshot,
                  pluginState
                )
                delete pluginState.restore
                delete pluginState.snapshot
                delete pluginState.prevSnapshot
                binding.mux(() => {
                  binding._prosemirrorChanged(
                    binding.prosemirrorView.state.doc
                  )
                })
              }
            })
          }
        }
        return pluginState
      }
    },
    view: (view) => {
      binding.initView(view)
      if (mapping == null) {
        binding._forceRerender()
      }
      onFirstRender()
      return {
        update: () => {
          const pluginState = plugin.getState(view.state)
          if (
            pluginState.snapshot == null && pluginState.prevSnapshot == null
          ) {
            if (
              initialContentChanged ||
              view.state.doc.content.findDiffStart(
                view.state.doc.type.createAndFill().content
              ) !== null
            ) {
              initialContentChanged = true
              if (
                pluginState.addToHistory === false &&
                !pluginState.isChangeOrigin
              ) {
                const yUndoPluginState = yUndoPluginKey.getState(view.state)
                const um = yUndoPluginState && yUndoPluginState.undoManager
                if (um) {
                  um.stopCapturing()
                }
              }
              binding.mux(() => {
                /** @type {Y.Doc} */ (pluginState.doc).transact((tr) => {
                  tr.meta.set('addToHistory', pluginState.addToHistory)
                  binding._prosemirrorChanged(view.state.doc)
                }, ySyncPluginKey)
              })
            }
          }
        },
        destroy: () => {
          binding.destroy()
        }
      }
    }
  })
  return plugin
}

const restoreRelativeSelection = (tr, relSel, binding) => {
  if (relSel !== null && relSel.anchor !== null && relSel.head !== null) {
    if (relSel.type === 'all') {
      tr.setSelection(new AllSelection(tr.doc))
    } else if (relSel.type === 'node') {
      const anchor = relativePositionToAbsolutePosition(
        binding.doc,
        binding.type,
        relSel.anchor,
        binding.mapping
      )
      tr.setSelection(NodeSelection.create(tr.doc, anchor))
    } else {
      const anchor = relativePositionToAbsolutePosition(
        binding.doc,
        binding.type,
        relSel.anchor,
        binding.mapping
      )
      const head = relativePositionToAbsolutePosition(
        binding.doc,
        binding.type,
        relSel.head,
        binding.mapping
      )
      if (anchor !== null && head !== null) {
        const sel = TextSelection.between(tr.doc.resolve(anchor), tr.doc.resolve(head))
        tr.setSelection(sel)
      }
    }
  }
}

export const getRelativeSelection = (pmbinding, state) => ({
  type: /** @type {any} */ (state.selection).jsonID,
  anchor: absolutePositionToRelativePosition(
    state.selection.anchor,
    pmbinding.type,
    pmbinding.mapping
  ),
  head: absolutePositionToRelativePosition(
    state.selection.head,
    pmbinding.type,
    pmbinding.mapping
  )
})

export class ProsemirrorBinding {
  constructor (yXmlFragment, mapping = new Map()) {
    this.type = yXmlFragment
    this.prosemirrorView = null
    this.mux = createMutex()
    this.mapping = mapping
    this.isOMark = new Map()
    this._observeFunction = this._typeChanged.bind(this)
    // @ts-ignore
    this.doc = yXmlFragment.doc
    this.beforeTransactionSelection = null
    this.beforeAllTransactions = () => {
      if (this.beforeTransactionSelection === null && this.prosemirrorView != null) {
        this.beforeTransactionSelection = getRelativeSelection(
          this,
          this.prosemirrorView.state
        )
      }
    }
    this.afterAllTransactions = () => {
      this.beforeTransactionSelection = null
    }
    this._domSelectionInView = null
  }

  get _tr () {
    return this.prosemirrorView.state.tr.setMeta('addToHistory', false)
  }

  _isLocalCursorInView () {
    if (!this.prosemirrorView.hasFocus()) return false
    if (environment.isBrowser && this._domSelectionInView === null) {
      eventloop.timeout(0, () => {
        this._domSelectionInView = null
      })
      this._domSelectionInView = this._isDomSelectionInView()
    }
    return this._domSelectionInView
  }

  _isDomSelectionInView () {
    const selection = this.prosemirrorView._root.getSelection()

    if (selection == null || selection.anchorNode == null) return false

    const range = this.prosemirrorView._root.createRange()
    range.setStart(selection.anchorNode, selection.anchorOffset)
    range.setEnd(selection.focusNode, selection.focusOffset)

    const rects = range.getClientRects()
    if (rects.length === 0) {
      if (range.startContainer && range.collapsed) {
        range.selectNodeContents(range.startContainer)
      }
    }

    const bounding = range.getBoundingClientRect()
    const documentElement = dom.doc.documentElement

    return bounding.bottom >= 0 && bounding.right >= 0 &&
      bounding.left <=
        (window.innerWidth || documentElement.clientWidth || 0) &&
      bounding.top <= (window.innerHeight || documentElement.clientHeight || 0)
  }

  renderSnapshot (snapshot, prevSnapshot) {
    if (!prevSnapshot) {
      prevSnapshot = Y.createSnapshot(Y.createDeleteSet(), new Map())
    }
    this.prosemirrorView.dispatch(
      this._tr.setMeta(ySyncPluginKey, { snapshot, prevSnapshot })
    )
  }

  unrenderSnapshot () {
    this.mapping.clear()
    this.mux(() => {
      const fragmentContent = this.type.toArray().map((t) =>
        createNodeFromYElement(
          /** @type {Y.XmlElement} */ (t),
          this.prosemirrorView.state.schema,
          this
        )
      ).filter((n) => n !== null)
      // @ts-ignore
      const tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      )
      tr.setMeta(ySyncPluginKey, { snapshot: null, prevSnapshot: null })
      this.prosemirrorView.dispatch(tr)
    })
  }

  _forceRerender () {
    this.mapping.clear()
    this.mux(() => {
      const sel = this.beforeTransactionSelection !== null ? null : this.prosemirrorView.state.selection
      const fragmentContent = this.type.toArray().map((t) =>
        createNodeFromYElement(
          /** @type {Y.XmlElement} */ (t),
          this.prosemirrorView.state.schema,
          this
        )
      ).filter((n) => n !== null)
      // @ts-ignore
      const tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      )
      if (sel) {
        const clampedAnchor = math.min(math.max(sel.anchor, 0), tr.doc.content.size)
        const clampedHead = math.min(math.max(sel.head, 0), tr.doc.content.size)

        tr.setSelection(TextSelection.create(tr.doc, clampedAnchor, clampedHead))
      }
      this.prosemirrorView.dispatch(
        tr.setMeta(ySyncPluginKey, { isChangeOrigin: true, binding: this })
      )
    })
  }

  _renderSnapshot (snapshot, prevSnapshot, pluginState) {
    let historyDoc = this.doc
    let historyType = this.type
    if (!snapshot) {
      snapshot = Y.snapshot(this.doc)
    }
    if (snapshot instanceof Uint8Array || prevSnapshot instanceof Uint8Array) {
      if (!(snapshot instanceof Uint8Array) || !(prevSnapshot instanceof Uint8Array)) {
        error.unexpectedCase()
      }
      historyDoc = new Y.Doc({ gc: false })
      Y.applyUpdateV2(historyDoc, prevSnapshot)
      prevSnapshot = Y.snapshot(historyDoc)
      Y.applyUpdateV2(historyDoc, snapshot)
      snapshot = Y.snapshot(historyDoc)
      if (historyType._item === null) {
        const rootKey = Array.from(this.doc.share.keys()).find(
          (key) => this.doc.share.get(key) === this.type
        )
        historyType = historyDoc.getXmlFragment(rootKey)
      } else {
        const historyStructs =
          historyDoc.store.clients.get(historyType._item.id.client) ?? []
        const itemIndex = Y.findIndexSS(
          historyStructs,
          historyType._item.id.clock
        )
        const item = /** @type {Y.Item} */ (historyStructs[itemIndex])
        const content = /** @type {Y.ContentType} */ (item.content)
        historyType = /** @type {Y.XmlFragment} */ (content.type)
      }
    }
    this.mapping.clear()
    this.mux(() => {
      historyDoc.transact((transaction) => {
        const pud = pluginState.permanentUserData
        if (pud) {
          pud.dss.forEach((ds) => {
            Y.iterateDeletedStructs(transaction, ds, (_item) => {})
          })
        }
        const computeYChange = (type, id) => {
          const user = type === 'added'
            ? pud.getUserByClientId(id.client)
            : pud.getUserByDeletedId(id)
          return {
            user,
            type,
            color: getUserColor(
              pluginState.colorMapping,
              pluginState.colors,
              user
            )
          }
        }
        const fragmentContent = Y.typeListToArraySnapshot(
          historyType,
          new Y.Snapshot(prevSnapshot.ds, snapshot.sv)
        ).map((t) => {
          if (
            !t._item.deleted || isVisible(t._item, snapshot) ||
            isVisible(t._item, prevSnapshot)
          ) {
            return createNodeFromYElement(
              t,
              this.prosemirrorView.state.schema,
              { mapping: new Map(), isOMark: new Map() },
              snapshot,
              prevSnapshot,
              computeYChange
            )
          } else {
            return null
          }
        }).filter((n) => n !== null)
        // @ts-ignore
        const tr = this._tr.replace(
          0,
          this.prosemirrorView.state.doc.content.size,
          new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
        )
        this.prosemirrorView.dispatch(
          tr.setMeta(ySyncPluginKey, { isChangeOrigin: true })
        )
      }, ySyncPluginKey)
    })
  }

  _typeChanged (events, transaction) {
    if (this.prosemirrorView == null) return
    const syncState = ySyncPluginKey.getState(this.prosemirrorView.state)
    if (
      events.length === 0 || syncState.snapshot != null ||
      syncState.prevSnapshot != null
    ) {
      this.renderSnapshot(syncState.snapshot, syncState.prevSnapshot)
      return
    }
    this.mux(() => {
      const delType = (_, type) => this.mapping.delete(type)
      Y.iterateDeletedStructs(
        transaction,
        transaction.deleteSet,
        (struct) => {
          if (struct.constructor === Y.Item) {
            const type = /** @type {Y.ContentType} */ (/** @type {Y.Item} */ (struct).content).type
            type && this.mapping.delete(type)
          }
        }
      )
      transaction.changed.forEach(delType)
      transaction.changedParentTypes.forEach(delType)
      const fragmentContent = this.type.toArray().map((t) =>
        createNodeIfNotExists(
          /** @type {Y.XmlElement | Y.XmlHook} */ (t),
          this.prosemirrorView.state.schema,
          this
        )
      ).filter((n) => n !== null)
      // @ts-ignore
      let tr = this._tr.replace(
        0,
        this.prosemirrorView.state.doc.content.size,
        new PModel.Slice(PModel.Fragment.from(fragmentContent), 0, 0)
      )
      restoreRelativeSelection(tr, this.beforeTransactionSelection, this)
      tr = tr.setMeta(ySyncPluginKey, { isChangeOrigin: true, isUndoRedoOperation: transaction.origin instanceof Y.UndoManager })
      if (
        this.beforeTransactionSelection !== null && this._isLocalCursorInView()
      ) {
        tr.scrollIntoView()
      }
      this.prosemirrorView.dispatch(tr)
    })
  }

  _prosemirrorChanged (doc) {
    this.doc.transact(() => {
      updateYFragment(this.doc, this.type, doc, this)
      this.beforeTransactionSelection = getRelativeSelection(
        this,
        this.prosemirrorView.state
      )
    }, ySyncPluginKey)
  }

  initView (prosemirrorView) {
    if (this.prosemirrorView != null) this.destroy()
    this.prosemirrorView = prosemirrorView
    this.doc.on('beforeAllTransactions', this.beforeAllTransactions)
    this.doc.on('afterAllTransactions', this.afterAllTransactions)
    this.type.observeDeep(this._observeFunction)
  }

  destroy () {
    if (this.prosemirrorView == null) return
    this.prosemirrorView = null
    this.type.unobserveDeep(this._observeFunction)
    this.doc.off('beforeAllTransactions', this.beforeAllTransactions)
    this.doc.off('afterAllTransactions', this.afterAllTransactions)
  }
}

const createNodeIfNotExists = (
  el,
  schema,
  meta,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const node = /** @type {PModel.Node} */ (meta.mapping.get(el))
  if (node === undefined) {
    if (el instanceof Y.XmlElement) {
      return createNodeFromYElement(
        el,
        schema,
        meta,
        snapshot,
        prevSnapshot,
        computeYChange
      )
    } else {
      throw error.methodUnimplemented()
    }
  }
  return node
}

export const createNodeFromYElement = (
  el,
  schema,
  meta,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const children = []
  const createChildren = (type) => {
    if (type instanceof Y.XmlElement) {
      const n = createNodeIfNotExists(
        type,
        schema,
        meta,
        snapshot,
        prevSnapshot,
        computeYChange
      )
      if (n !== null) {
        children.push(n)
      }
    } else {
      const nextytext = /** @type {Y.ContentType} */ (type._item.right?.content)?.type
      if (nextytext instanceof Y.Text && !nextytext._item.deleted && nextytext._item.id.client === nextytext.doc.clientID) {
        type.applyDelta([
          { retain: type.length },
          ...nextytext.toDelta()
        ])
        nextytext.doc.transact(tr => {
          nextytext._item.delete(tr)
        })
      }
      const ns = createTextNodesFromYText(
        type,
        schema,
        meta,
        snapshot,
        prevSnapshot,
        computeYChange
      )
      if (ns !== null) {
        ns.forEach((textchild) => {
          if (textchild !== null) {
            children.push(textchild)
          }
        })
      }
    }
  }
  if (snapshot === undefined || prevSnapshot === undefined) {
    el.toArray().forEach(createChildren)
  } else {
    Y.typeListToArraySnapshot(el, new Y.Snapshot(prevSnapshot.ds, snapshot.sv))
      .forEach(createChildren)
  }
  try {
    const attrs = el.getAttributes(snapshot)
    if (snapshot !== undefined) {
      if (!isVisible(/** @type {Y.Item} */ (el._item), snapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange('removed', /** @type {Y.Item} */ (el._item).id)
          : { type: 'removed' }
      } else if (!isVisible(/** @type {Y.Item} */ (el._item), prevSnapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange('added', /** @type {Y.Item} */ (el._item).id)
          : { type: 'added' }
      }
    }
    const node = schema.node(el.nodeName, attrs, children)
    meta.mapping.set(el, node)
    return node
  } catch (e) {
    /** @type {Y.Doc} */ (el.doc).transact((transaction) => {
      /** @type {Y.Item} */ (el._item).delete(transaction)
    }, ySyncPluginKey)
    meta.mapping.delete(el)
    return null
  }
}

const createTextNodesFromYText = (
  text,
  schema,
  _meta,
  snapshot,
  prevSnapshot,
  computeYChange
) => {
  const nodes = []
  const deltas = text.toDelta(snapshot, prevSnapshot, computeYChange)
  try {
    for (let i = 0; i < deltas.length; i++) {
      const delta = deltas[i]
      nodes.push(schema.text(delta.insert, attributesToMarks(delta.attributes, schema)))
    }
  } catch (e) {
    /** @type {Y.Doc} */ (text.doc).transact((transaction) => {
      /** @type {Y.Item} */ (text._item).delete(transaction)
    }, ySyncPluginKey)
    return null
  }
  // @ts-ignore
  return nodes
}

const createTypeFromTextNodes = (nodes, meta) => {
  const type = new Y.XmlText()
  const delta = nodes.map((node) => ({
    // @ts-ignore
    insert: node.text,
    attributes: marksToAttributes(node.marks, meta)
  }))
  type.applyDelta(delta)
  meta.mapping.set(type, nodes)
  return type
}

const createTypeFromElementNode = (node, meta) => {
  const type = new Y.XmlElement(node.type.name)
  for (const key in node.attrs) {
    const val = node.attrs[key]
    if (val !== null && key !== 'ychange') {
      type.setAttribute(key, val)
    }
  }
  type.insert(
    0,
    normalizePNodeContent(node).map((n) =>
      createTypeFromTextOrElementNode(n, meta)
    )
  )
  meta.mapping.set(type, node)
  return type
}

const createTypeFromTextOrElementNode = (node, meta) =>
  node instanceof Array
    ? createTypeFromTextNodes(node, meta)
    : createTypeFromElementNode(node, meta)

const isObject = (val) => typeof val === 'object' && val !== null

const equalAttrs = (pattrs, yattrs) => {
  const keys = Object.keys(pattrs).filter((key) => pattrs[key] !== null)
  let eq =
    keys.length ===
      (yattrs == null ? 0 : Object.keys(yattrs).filter((key) => yattrs[key] !== null).length)
  for (let i = 0; i < keys.length && eq; i++) {
    const key = keys[i]
    const l = pattrs[key]
    const r = yattrs[key]
    eq = key === 'ychange' || l === r ||
      (isObject(l) && isObject(r) && equalAttrs(l, r))
  }
  return eq
}

const normalizePNodeContent = (pnode) => {
  const c = pnode.content.content
  const res = []
  for (let i = 0; i < c.length; i++) {
    const n = c[i]
    if (n.isText) {
      const textNodes = []
      for (let tnode = c[i]; i < c.length && tnode.isText; tnode = c[++i]) {
        textNodes.push(tnode)
      }
      i--
      res.push(textNodes)
    } else {
      res.push(n)
    }
  }
  return res
}

const equalYTextPText = (ytext, ptexts) => {
  const delta = ytext.toDelta()
  return delta.length === ptexts.length &&
    delta.every(/** @type {(d:any,i:number) => boolean} */ (d, i) =>
      d.insert === /** @type {any} */ (ptexts[i]).text &&
      object.keys(d.attributes || {}).length === ptexts[i].marks.length &&
      object.every(d.attributes, (attr, yattrname) => {
        const markname = yattr2markname(yattrname)
        const pmarks = ptexts[i].marks
        return equalAttrs(attr, pmarks.find(/** @param {any} mark */ mark => mark.type.name === markname)?.attrs)
      })
    )
}

const equalYTypePNode = (ytype, pnode) => {
  if (
    ytype instanceof Y.XmlElement && !(pnode instanceof Array) &&
    matchNodeName(ytype, pnode)
  ) {
    const normalizedContent = normalizePNodeContent(pnode)
    return ytype._length === normalizedContent.length &&
      equalAttrs(ytype.getAttributes(), pnode.attrs) &&
      ytype.toArray().every((ychild, i) =>
        equalYTypePNode(ychild, normalizedContent[i])
      )
  }
  return ytype instanceof Y.XmlText && pnode instanceof Array &&
    equalYTextPText(ytype, pnode)
}

const mappedIdentity = (mapped, pcontent) =>
  mapped === pcontent ||
  (mapped instanceof Array && pcontent instanceof Array &&
    mapped.length === pcontent.length && mapped.every((a, i) =>
    pcontent[i] === a
  ))

const computeChildEqualityFactor = (ytype, pnode, meta) => {
  const yChildren = ytype.toArray()
  const pChildren = normalizePNodeContent(pnode)
  const pChildCnt = pChildren.length
  const yChildCnt = yChildren.length
  const minCnt = math.min(yChildCnt, pChildCnt)
  let left = 0
  let right = 0
  let foundMappedChild = false
  for (; left < minCnt; left++) {
    const leftY = yChildren[left]
    const leftP = pChildren[left]
    if (mappedIdentity(meta.mapping.get(leftY), leftP)) {
      foundMappedChild = true
    } else if (!equalYTypePNode(leftY, leftP)) {
      break
    }
  }
  for (; left + right < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1]
    const rightP = pChildren[pChildCnt - right - 1]
    if (mappedIdentity(meta.mapping.get(rightY), rightP)) {
      foundMappedChild = true
    } else if (!equalYTypePNode(rightY, rightP)) {
      break
    }
  }
  return {
    equalityFactor: left + right,
    foundMappedChild
  }
}

const ytextTrans = (ytext) => {
  let str = ''
  let n = ytext._start
  const nAttrs = {}
  while (n !== null) {
    if (!n.deleted) {
      if (n.countable && n.content instanceof Y.ContentString) {
        str += n.content.str
      } else if (n.content instanceof Y.ContentFormat) {
        nAttrs[n.content.key] = null
      }
    }
    n = n.right
  }
  return {
    str,
    nAttrs
  }
}

const updateYText = (ytext, ptexts, meta) => {
  meta.mapping.set(ytext, ptexts)
  const { nAttrs, str } = ytextTrans(ytext)
  const content = ptexts.map((p) => ({
    insert: /** @type {any} */ (p).text,
    attributes: Object.assign({}, nAttrs, marksToAttributes(p.marks, meta))
  }))
  const { insert, remove, index } = simpleDiff(
    str,
    content.map((c) => c.insert).join('')
  )
  ytext.delete(index, remove)
  ytext.insert(index, insert)
  ytext.applyDelta(
    content.map((c) => ({ retain: c.insert.length, attributes: c.attributes }))
  )
}

const hashedMarkNameRegex = /(.*)(--[a-zA-Z0-9+/=]{8})$/
export const yattr2markname = attrName => hashedMarkNameRegex.exec(attrName)?.[1] ?? attrName

export const attributesToMarks = (attrs, schema) => {
  const marks = []
  for (const markName in attrs) {
    marks.push(schema.mark(yattr2markname(markName), attrs[markName]))
  }
  return marks
}

const marksToAttributes = (marks, meta) => {
  const pattrs = {}
  marks.forEach((mark) => {
    if (mark.type.name !== 'ychange') {
      const isOverlapping = map.setIfUndefined(meta.isOMark, mark.type, () => !mark.type.excludes(mark.type))
      pattrs[isOverlapping ? `${mark.type.name}--${utils.hashOfJSON(mark.toJSON())}` : mark.type.name] = mark.attrs
    }
  })
  return pattrs
}

export const updateYFragment = (y, yDomFragment, pNode, meta) => {
  if (
    yDomFragment instanceof Y.XmlElement &&
    yDomFragment.nodeName !== pNode.type.name
  ) {
    throw new Error('node name mismatch!')
  }
  meta.mapping.set(yDomFragment, pNode)
  if (yDomFragment instanceof Y.XmlElement) {
    const yDomAttrs = yDomFragment.getAttributes()
    const pAttrs = pNode.attrs
    for (const key in pAttrs) {
      if (pAttrs[key] !== null) {
        if (yDomAttrs[key] !== pAttrs[key] && key !== 'ychange') {
          yDomFragment.setAttribute(key, pAttrs[key])
        }
      } else {
        yDomFragment.removeAttribute(key)
      }
    }
    for (const key in yDomAttrs) {
      if (pAttrs[key] === undefined) {
        yDomFragment.removeAttribute(key)
      }
    }
  }
  const pChildren = normalizePNodeContent(pNode)
  const pChildCnt = pChildren.length
  const yChildren = yDomFragment.toArray()
  const yChildCnt = yChildren.length
  const minCnt = math.min(pChildCnt, yChildCnt)
  let left = 0
  let right = 0
  for (; left < minCnt; left++) {
    const leftY = yChildren[left]
    const leftP = pChildren[left]
    if (!mappedIdentity(meta.mapping.get(leftY), leftP)) {
      if (equalYTypePNode(leftY, leftP)) {
        meta.mapping.set(leftY, leftP)
      } else {
        break
      }
    }
  }
  for (; right + left < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1]
    const rightP = pChildren[pChildCnt - right - 1]
    if (!mappedIdentity(meta.mapping.get(rightY), rightP)) {
      if (equalYTypePNode(rightY, rightP)) {
        meta.mapping.set(rightY, rightP)
      } else {
        break
      }
    }
  }
  y.transact(() => {
    while (yChildCnt - left - right > 0 && pChildCnt - left - right > 0) {
      const leftY = yChildren[left]
      const leftP = pChildren[left]
      const rightY = yChildren[yChildCnt - right - 1]
      const rightP = pChildren[pChildCnt - right - 1]
      if (leftY instanceof Y.XmlText && leftP instanceof Array) {
        if (!equalYTextPText(leftY, leftP)) {
          updateYText(leftY, leftP, meta)
        }
        left += 1
      } else {
        let updateLeft = leftY instanceof Y.XmlElement &&
          matchNodeName(leftY, leftP)
        let updateRight = rightY instanceof Y.XmlElement &&
          matchNodeName(rightY, rightP)
        if (updateLeft && updateRight) {
          const equalityLeft = computeChildEqualityFactor(
            /** @type {Y.XmlElement} */ (leftY),
            /** @type {PModel.Node} */ (leftP),
            meta
          )
          const equalityRight = computeChildEqualityFactor(
            /** @type {Y.XmlElement} */ (rightY),
            /** @type {PModel.Node} */ (rightP),
            meta
          )
          if (
            equalityLeft.foundMappedChild && !equalityRight.foundMappedChild
          ) {
            updateRight = false
          } else if (
            !equalityLeft.foundMappedChild && equalityRight.foundMappedChild
          ) {
            updateLeft = false
          } else if (
            equalityLeft.equalityFactor < equalityRight.equalityFactor
          ) {
            updateLeft = false
          } else {
            updateRight = false
          }
        }
        if (updateLeft) {
          updateYFragment(
            y,
            /** @type {Y.XmlFragment} */ (leftY),
            /** @type {PModel.Node} */ (leftP),
            meta
          )
          left += 1
        } else if (updateRight) {
          updateYFragment(
            y,
            /** @type {Y.XmlFragment} */ (rightY),
            /** @type {PModel.Node} */ (rightP),
            meta
          )
          right += 1
        } else {
          meta.mapping.delete(yDomFragment.get(left))
          yDomFragment.delete(left, 1)
          yDomFragment.insert(left, [
            createTypeFromTextOrElementNode(leftP, meta)
          ])
          left += 1
        }
      }
    }
    const yDelLen = yChildCnt - left - right
    if (
      yChildCnt === 1 && pChildCnt === 0 && yChildren[0] instanceof Y.XmlText
    ) {
      meta.mapping.delete(yChildren[0])
      yChildren[0].delete(0, yChildren[0].length)
    } else if (yDelLen > 0) {
      yDomFragment.slice(left, left + yDelLen).forEach(type => meta.mapping.delete(type))
      yDomFragment.delete(left, yDelLen)
    }
    if (left + right < pChildCnt) {
      const ins = []
      for (let i = left; i < pChildCnt - right; i++) {
        ins.push(createTypeFromTextOrElementNode(pChildren[i], meta))
      }
      yDomFragment.insert(left, ins)
    }
  }, ySyncPluginKey)
}

const matchNodeName = (yElement, pNode) =>
  !(pNode instanceof Array) && yElement.nodeName === pNode.type.name

