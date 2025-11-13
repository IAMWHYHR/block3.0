import * as Y from 'yjs'
import * as PModel from 'prosemirror-model'
import { EditorView } from 'prosemirror-view'
import { updateYFragment } from '../y-prosemirror'

/**
 * Binding between a child Y.Doc's YXmlFragment and a ProseMirror block node
 */
export class BlockBinding {
	public readonly childYdoc: Y.Doc
	public readonly fragment: Y.XmlFragment
	public readonly blockNode: PModel.Node
	public readonly editorView: EditorView
	private readonly _observeFunction: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void
	private isDestroyed = false

	constructor(
		childYdoc: Y.Doc,
		blockNode: PModel.Node,
		editorView: EditorView,
	) {
		this.childYdoc = childYdoc
		this.fragment = childYdoc.getXmlFragment('default')
		this.blockNode = blockNode
		this.editorView = editorView
		this._observeFunction = this._fragmentChanged.bind(this)

		// Initialize: sync YXmlFragment to block node
		this._syncFragmentToNode()

		// Listen to fragment changes
		this.fragment.observeDeep(this._observeFunction)
	}

	/**
	 * Sync YXmlFragment content to the block node
	 */
	private _syncFragmentToNode() {
		if (this.isDestroyed) return

		const meta = { mapping: new Map(), isOMark: new Map() }
		const fragmentContent = this.fragment.toArray().map((t) =>
			createNodeFromYElement(
				t as Y.XmlElement,
				this.editorView.state.schema,
				meta,
			)
		).filter((n) => n !== null) as PModel.Node[]

		if (fragmentContent.length === 0) return

		// Find the block node position in the document
		const pos = this._findBlockNodePosition()
		if (pos === null) return

		// Replace block node content with fragment content
		const tr = this.editorView.state.tr
		const blockNodeStart = pos
		const blockNodeEnd = pos + this.blockNode.nodeSize

		// Create new block node with fragment content
		const newBlockNode = this.blockNode.type.create(
			this.blockNode.attrs,
			PModel.Fragment.from(fragmentContent),
		)

		tr.replaceWith(blockNodeStart, blockNodeEnd, newBlockNode)
		this.editorView.dispatch(tr)
	}

	/**
	 * Find the position of the block node in the document
	 */
	private _findBlockNodePosition(): number | null {
		let pos = 1 // Start after doc node
		const doc = this.editorView.state.doc

		const findNode = (node: PModel.Node, offset: number): number | null => {
			if (node === this.blockNode) {
				return offset
			}

			node.forEach((child, childOffset) => {
				const childPos = findNode(child, offset + childOffset + 1)
				if (childPos !== null) {
					return childPos
				}
			})

			return null
		}

		return findNode(doc, 1)
	}

	/**
	 * Handle YXmlFragment changes
	 */
	private _fragmentChanged(events: Y.YEvent<any>[], transaction: Y.Transaction) {
		if (this.isDestroyed) return
		if (events.length === 0) return

		// Sync fragment to node
		this._syncFragmentToNode()
	}

	/**
	 * Update YXmlFragment from block node content
	 */
	public updateYXmlFragment() {
		if (this.isDestroyed) return

		const meta = { mapping: new Map(), isOMark: new Map() }
		this.childYdoc.transact(() => {
			updateYFragment(this.childYdoc, this.fragment, this.blockNode, meta)
		}, this)
	}

	/**
	 * Destroy the binding
	 */
	public destroy() {
		if (this.isDestroyed) return
		this.isDestroyed = true
		this.fragment.unobserveDeep(this._observeFunction)
	}
}

/**
 * Helper function to create a ProseMirror node from a Y.XmlElement
 * Simplified version based on y-prosemirror's createNodeFromYElement
 */
function createNodeFromYElement(
	el: Y.XmlElement,
	schema: PModel.Schema,
	meta: { mapping: Map<any, any>; isOMark: Map<any, any> },
): PModel.Node | null {
	try {
		const children: PModel.Node[] = []
		el.toArray().forEach((type) => {
			if (type instanceof Y.XmlElement) {
				const child = createNodeFromYElement(type, schema, meta)
				if (child !== null) {
					children.push(child)
				}
			} else if (type instanceof Y.XmlText) {
				const delta = type.toDelta()
				delta.forEach((d) => {
					const marks: PModel.Mark[] = []
					if (d.attributes) {
						Object.keys(d.attributes).forEach((markName) => {
							const markType = schema.marks[markName]
							if (markType) {
								marks.push(markType.create(d.attributes[markName]))
							}
						})
					}
					if (typeof d.insert === 'string') {
						children.push(schema.text(d.insert, marks))
					}
				})
			}
		})

		const attrs = el.getAttributes()
		const nodeType = schema.nodes[el.nodeName]
		if (!nodeType) {
			return null
		}

		return nodeType.create(attrs, children)
	} catch (e) {
		console.error('Error creating node from Y element:', e)
		return null
	}
}

