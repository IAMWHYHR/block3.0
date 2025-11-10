import { updateYFragment, createNodeFromYElement, yattr2markname, createEmptyMeta } from './plugins/sync-plugin.js' // eslint-disable-line
import { ySyncPluginKey } from './plugins/keys.js'
import * as Y from 'yjs'
import { EditorView } from 'prosemirror-view' // eslint-disable-line
import { Node, Schema, Fragment } from 'prosemirror-model' // eslint-disable-line
import * as error from 'lib0/error'
import * as map from 'lib0/map'
import * as eventloop from 'lib0/eventloop'

let viewsToUpdate = null

const updateMetas = () => {
  const ups = /** @type {Map<EditorView, Map<any, any>>} */ (viewsToUpdate)
  viewsToUpdate = null
  ups.forEach((metas, view) => {
    const tr = view.state.tr
    const syncState = ySyncPluginKey.getState(view.state)
    if (syncState && syncState.binding && !syncState.binding.isDestroyed) {
      metas.forEach((val, key) => {
        tr.setMeta(key, val)
      })
      view.dispatch(tr)
    }
  })
}

export const setMeta = (view, key, value) => {
  if (!viewsToUpdate) {
    viewsToUpdate = new Map()
    eventloop.timeout(0, updateMetas)
  }
  map.setIfUndefined(viewsToUpdate, view, map.create).set(key, value)
}

export const absolutePositionToRelativePosition = (pos, type, mapping) => {
  if (pos === 0) {
    return Y.createRelativePositionFromTypeIndex(type, 0, type.length === 0 ? -1 : 0)
  }
  let n = type._first === null ? null : /** @type {Y.ContentType} */ (type._first.content).type
  while (n !== null && type !== n) {
    if (n instanceof Y.XmlText) {
      if (n._length >= pos) {
        return Y.createRelativePositionFromTypeIndex(n, pos, type.length === 0 ? -1 : 0)
      } else {
        pos -= n._length
      }
      if (n._item !== null && n._item.next !== null) {
        n = /** @type {Y.ContentType} */ (n._item.next.content).type
      } else {
        do {
          n = n._item === null ? null : n._item.parent
          pos--
        } while (n !== type && n !== null && n._item !== null && n._item.next === null)
        if (n !== null && n !== type) {
          n = n._item === null ? null : /** @type {Y.ContentType} */ (/** @type Y.Item */ (n._item.next).content).type
        }
      }
    } else {
      const pNodeSize = /** @type {any} */ (mapping.get(n) || { nodeSize: 0 }).nodeSize
      if (n._first !== null && pos < pNodeSize) {
        n = /** @type {Y.ContentType} */ (n._first.content).type
        pos--
      } else {
        if (pos === 1 && n._length === 0 && pNodeSize > 1) {
          return new Y.RelativePosition(n._item === null ? null : n._item.id, n._item === null ? Y.findRootTypeKey(n) : null, null)
        }
        pos -= pNodeSize
        if (n._item !== null && n._item.next !== null) {
          n = /** @type {Y.ContentType} */ (n._item.next.content).type
        } else {
          if (pos === 0) {
            n = n._item === null ? n : n._item.parent
            return new Y.RelativePosition(n._item === null ? null : n._item.id, n._item === null ? Y.findRootTypeKey(n) : null, null)
          }
          do {
            n = /** @type {Y.Item} */ (n._item).parent
            pos--
          } while (n !== type && /** @type {Y.Item} */ (n._item).next === null)
          if (n !== type) {
            n = /** @type {Y.ContentType} */ (/** @type {Y.Item} */ (/** @type {Y.Item} */ (n._item).next).content).type
          }
        }
      }
    }
    if (n === null) {
      throw error.unexpectedCase()
    }
    if (pos === 0 && n.constructor !== Y.XmlText && n !== type) {
      return createRelativePosition(n._item.parent, n._item)
    }
  }
  return Y.createRelativePositionFromTypeIndex(type, type._length, type.length === 0 ? -1 : 0)
}

const createRelativePosition = (type, item) => {
  let typeid = null
  let tname = null
  if (type._item === null) {
    tname = Y.findRootTypeKey(type)
  } else {
    typeid = Y.createID(type._item.id.client, type._item.id.clock)
  }
  return new Y.RelativePosition(typeid, tname, item.id)
}

export const relativePositionToAbsolutePosition = (y, documentType, relPos, mapping) => {
  const decodedPos = Y.createAbsolutePositionFromRelativePosition(relPos, y)
  if (decodedPos === null || (decodedPos.type !== documentType && !Y.isParentOf(documentType, decodedPos.type._item))) {
    return null
  }
  let type = decodedPos.type
  let pos = 0
  if (type.constructor === Y.XmlText) {
    pos = decodedPos.index
  } else if (type._item === null || !type._item.deleted) {
    let n = type._first
    let i = 0
    while (i < type._length && i < decodedPos.index && n !== null) {
      if (!n.deleted) {
        const t = /** @type {Y.ContentType} */ (n.content).type
        i++
        if (t instanceof Y.XmlText) {
          pos += t._length
        } else {
          pos += /** @type {any} */ (mapping.get(t)).nodeSize
        }
      }
      n = /** @type {Y.Item} */ (n.right)
    }
    pos += 1
  }
  while (type !== documentType && type._item !== null) {
    const parent = type._item.parent
    if (parent._item === null || !parent._item.deleted) {
      pos += 1
      let n = /** @type {Y.AbstractType} */ (parent)._first
      while (n !== null) {
        const contentType = /** @type {Y.ContentType} */ (n.content).type
        if (contentType === type) {
          break
        }
        if (!n.deleted) {
          if (contentType instanceof Y.XmlText) {
            pos += contentType._length
          } else {
            pos += /** @type {any} */ (mapping.get(contentType)).nodeSize
          }
        }
        n = n.right
      }
    }
    type = /** @type {Y.AbstractType} */ (parent)
  }
  return pos - 1
}

export const yXmlFragmentToProseMirrorFragment = (yXmlFragment, schema) => {
  const fragmentContent = yXmlFragment.toArray().map((t) =>
    createNodeFromYElement(
      /** @type {Y.XmlElement} */ (t),
      schema,
      createEmptyMeta()
    )
  ).filter((n) => n !== null)
  return Fragment.fromArray(fragmentContent)
}

export const yXmlFragmentToProseMirrorRootNode = (yXmlFragment, schema) =>
  schema.topNodeType.create(null, yXmlFragmentToProseMirrorFragment(yXmlFragment, schema))

export const initProseMirrorDoc = (yXmlFragment, schema) => {
  const meta = createEmptyMeta()
  const fragmentContent = yXmlFragment.toArray().map((t) =>
    createNodeFromYElement(
      /** @type {Y.XmlElement} */ (t),
      schema,
      meta
    )
  ).filter((n) => n !== null)
  const doc = schema.topNodeType.create(null, Fragment.fromArray(fragmentContent))
  return { doc, meta, mapping: meta.mapping }
}

export function prosemirrorToYDoc (doc, xmlFragment = 'prosemirror') {
  const ydoc = new Y.Doc()
  const type = /** @type {Y.XmlFragment} */ (ydoc.get(xmlFragment, Y.XmlFragment))
  if (!type.doc) {
    return ydoc
  }

  prosemirrorToYXmlFragment(doc, type)
  return type.doc
}

export function prosemirrorToYXmlFragment (doc, xmlFragment) {
  const type = xmlFragment || new Y.XmlFragment()
  const ydoc = type.doc ? type.doc : { transact: (transaction) => transaction(undefined) }
  updateYFragment(ydoc, type, doc, { mapping: new Map(), isOMark: new Map() })
  return type
}

export function prosemirrorJSONToYDoc (schema, state, xmlFragment = 'prosemirror') {
  const doc = Node.fromJSON(schema, state)
  return prosemirrorToYDoc(doc, xmlFragment)
}

export function prosemirrorJSONToYXmlFragment (schema, state, xmlFragment) {
  const doc = Node.fromJSON(schema, state)
  return prosemirrorToYXmlFragment(doc, xmlFragment)
}

export function yDocToProsemirror (schema, ydoc) {
  const state = yDocToProsemirrorJSON(ydoc)
  return Node.fromJSON(schema, state)
}

export function yXmlFragmentToProsemirror (schema, xmlFragment) {
  const state = yXmlFragmentToProsemirrorJSON(xmlFragment)
  return Node.fromJSON(schema, state)
}

export function yDocToProsemirrorJSON (
  ydoc,
  xmlFragment = 'prosemirror'
) {
  return yXmlFragmentToProsemirrorJSON(ydoc.getXmlFragment(xmlFragment))
}

export function yXmlFragmentToProsemirrorJSON (xmlFragment) {
  const items = xmlFragment.toArray()

  const serialize = item => {
    let response

    if (item instanceof Y.XmlText) {
      const delta = item.toDelta()
      response = delta.map(/** @param {any} d */ (d) => {
        const text = {
          type: 'text',
          text: d.insert
        }
        if (d.attributes) {
          text.marks = Object.keys(d.attributes).map((type_) => {
            const attrs = d.attributes[type_]
            const type = yattr2markname(type_)
            const mark = {
              type
            }
            if (Object.keys(attrs)) {
              mark.attrs = attrs
            }
            return mark
          })
        }
        return text
      })
    } else if (item instanceof Y.XmlElement) {
      response = {
        type: item.nodeName
      }

      const attrs = item.getAttributes()
      if (Object.keys(attrs).length) {
        response.attrs = attrs
      }

      const children = item.toArray()
      if (children.length) {
        response.content = children.map(serialize).flat()
      }
    } else {
      error.unexpectedCase()
    }

    return response
  }

  return {
    type: 'doc',
    content: items.map(serialize)
  }
}


