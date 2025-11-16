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
	public blockNode: PModel.Node
	public readonly editorView: EditorView
	private readonly _observeFunction: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void
	private isDestroyed = false

	constructor(
		childYdoc: Y.Doc,
		blockNode: PModel.Node,
		editorView: EditorView,
		shouldSyncFromFragment: boolean = true,
	) {
		this.childYdoc = childYdoc
		this.fragment = childYdoc.getXmlFragment('default')
		this.blockNode = blockNode
		this.editorView = editorView
		this._observeFunction = this._fragmentChanged.bind(this)

		// Initialize: sync YXmlFragment to block node only if needed
		// When block is created from master doc (master -> editor), we need to sync
		// When block is created from editor (editor -> master), editor node is already latest
		if (shouldSyncFromFragment) {
			this._syncFragmentToNode()
		}

		// Listen to fragment changes
		this.fragment.observeDeep(this._observeFunction)
	}

	/**
	 * Sync YXmlFragment content to the block node
	 */
	private _syncFragmentToNode() {
		if (this.isDestroyed) return

		// Find the top-level YXmlElement in fragment (should be only one)
		const fragmentArray = this.fragment.toArray()
		let topLevelElement: Y.XmlElement | null = null

		for (const item of fragmentArray) {
			if (item instanceof Y.XmlElement) {
				topLevelElement = item
				break
			}
		}

		if (!topLevelElement) return

		// Extract content from the top-level element
		const meta = { mapping: new Map(), isOMark: new Map() }
		const elementContent = topLevelElement.toArray().map((t) => {
			if (t instanceof Y.XmlElement) {
				return createNodeFromYElement(t, this.editorView.state.schema, meta)
			} else if (t instanceof Y.XmlText) {
				// Convert YXmlText to ProseMirror text nodes
				const delta = t.toDelta()
				const textNodes: PModel.Node[] = []
				delta.forEach((d: any) => {
					const marks: PModel.Mark[] = []
					if (d.attributes) {
						Object.keys(d.attributes).forEach((markName) => {
							const markType = this.editorView.state.schema.marks[markName]
							if (markType) {
								marks.push(markType.create(d.attributes[markName]))
							}
						})
					}
					if (typeof d.insert === 'string') {
						textNodes.push(this.editorView.state.schema.text(d.insert, marks))
					}
				})
				return textNodes.length > 0 ? textNodes : null
			}
			return null
		}).flat().filter((n) => n !== null) as PModel.Node[]

		if (elementContent.length === 0) return

		// Find the block node position in the document
		const pos = this._findBlockNodePosition()
		if (pos === null) return

		// Replace block node content with element content
		const tr = this.editorView.state.tr
		const blockNodeStart = pos
		const blockNodeEnd = pos + this.blockNode.nodeSize

		// Create new block node with element content
		// Use attributes from topLevelElement if available, otherwise use blockNode.attrs
		const elementAttrs = topLevelElement.getAttributes()
		const newAttrs = { ...this.blockNode.attrs, ...elementAttrs }

		const newBlockNode = this.blockNode.type.create(
			newAttrs,
			PModel.Fragment.from(elementContent),
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
	 * Update block node reference
	 */
	public updateBlockNode(newBlockNode: PModel.Node) {
		if (this.isDestroyed) return
		this.blockNode = newBlockNode
	}

	/**
	 * Update YXmlFragment from block node content
	 * @param blockNode - Optional new block node to use. If not provided, uses this.blockNode
	 */
	public updateYXmlFragment(blockNode?: PModel.Node) {
		if (this.isDestroyed) return

		const nodeToUse = blockNode || this.blockNode
		
		// Update blockNode reference if new node is provided
		if (blockNode) {
			this.blockNode = blockNode
		}

		const meta = { mapping: new Map(), isOMark: new Map() }
		this.childYdoc.transact(() => {
			// Ensure fragment has a single top-level YXmlElement corresponding to blockNode
			const fragmentArray = this.fragment.toArray()
			let topLevelElement: Y.XmlElement | null = null

			// Find existing top-level element with matching nodeName
			for (const item of fragmentArray) {
				if (item instanceof Y.XmlElement && item.nodeName === nodeToUse.type.name) {
					topLevelElement = item
					break
				}
			}

			// If no matching element exists, create one
			if (!topLevelElement) {
				// Clear fragment to ensure only one top-level element
				this.fragment.delete(0, this.fragment.length)
				topLevelElement = new Y.XmlElement(nodeToUse.type.name)
				this.fragment.insert(0, [topLevelElement])
			}

			// Debug: Log the structure before update
			console.log('🔍 updateYXmlFragment - Before update:')
			console.log('  - blockNode type:', nodeToUse.type.name)
			console.log('  - blockNode content size:', nodeToUse.content.size)
			console.log('  - blockNode content:', nodeToUse.content.content.map((n: any) => 
				n.isText ? `text("${n.text}")` : `${n.type.name}`
			))
			console.log('  - topLevelElement nodeName:', topLevelElement.nodeName)
			console.log('  - topLevelElement children count:', topLevelElement.length)
			console.log('  - topLevelElement children:', topLevelElement.toArray().map(c => 
				c instanceof Y.XmlText ? `YXmlText(${c.length}, "${c.toString()}")` : 
				c instanceof Y.XmlElement ? `YXmlElement(${c.nodeName})` : 
				String(c)
			))

			// Update the top-level element with blockNode attributes and children
			// Use updateYFragment to sync the element with the blockNode
			try {
				updateYFragment(this.childYdoc, topLevelElement, nodeToUse, meta)
			} catch (error) {
				console.error('❌ updateYFragment error:', error)
				throw error
			}

			// Debug: Log the structure after update
			console.log('🔍 updateYXmlFragment - After update:')
			console.log('  - topLevelElement children count:', topLevelElement.length)
			console.log('  - topLevelElement children:', topLevelElement.toArray().map(c => 
				c instanceof Y.XmlText ? `YXmlText(${c.length}, "${c.toString()}")` : 
				c instanceof Y.XmlElement ? `YXmlElement(${c.nodeName})` : 
				String(c)
			))
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
				delta.forEach((d: any) => {
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

