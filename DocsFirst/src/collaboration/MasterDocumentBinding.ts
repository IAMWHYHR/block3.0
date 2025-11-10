import * as Y from 'yjs'
import { Editor, EditorState } from '@tiptap/core'
import { BlockBinding } from './BlockBinding.js'
import { EditorView } from 'prosemirror-view'

/**
 * Master document structure:
 * masterYdoc {
 *   index: Y.Map<block_id: string, index: number>
 *   data: Y.Map<block_id: string, childYdoc: Y.Doc>
 * }
 */
export class MasterDocumentBinding {
	public readonly masterYdoc: Y.Doc
	public readonly editor: Editor
	public readonly editorView: EditorView
	private readonly indexMap: Y.Map<number>
	private readonly dataMap: Y.Map<Y.Doc>
	private readonly blockBindings: Map<string, BlockBinding> = new Map()
	private readonly _observeFunction: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void
	private isDestroyed = false

	constructor(masterYdoc: Y.Doc, editor: Editor) {
		this.masterYdoc = masterYdoc
		this.editor = editor
		this.editorView = editor.view

		// Initialize maps
		this.indexMap = masterYdoc.getMap('index')
		this.dataMap = masterYdoc.getMap('data')

		this._observeFunction = this._masterDocChanged.bind(this)

		// Listen to master document changes
		this.indexMap.observe(this._observeFunction)
		this.dataMap.observe(this._observeFunction)

		// Initial sync
		this._syncMasterToEditor()

		// Listen to editor changes
		this.editor.on('update', this._editorChanged.bind(this))
	}

	/**
	 * Sync master document to editor
	 */
	private _syncMasterToEditor() {
		if (this.isDestroyed) return

		// Get all block IDs from master document
		const masterBlockIds = new Set<string>()
		this.indexMap.forEach((index, blockId) => {
			masterBlockIds.add(blockId)
		})

		// Get all block IDs from editor
		const editorBlockIds = new Set<string>()
		this._traverseEditorDoc((node, pos) => {
			if (node.attrs && node.attrs.uuid) {
				editorBlockIds.add(node.attrs.uuid)
			}
		})

		// Diff: blocks in master but not in editor
		for (const blockId of masterBlockIds) {
			if (!editorBlockIds.has(blockId)) {
				this._createBlockFromMaster(blockId)
			}
		}

		// Diff: blocks in editor but not in master
		for (const blockId of editorBlockIds) {
			if (!masterBlockIds.has(blockId)) {
				// This will be handled by _editorChanged when user creates a new block
			}
		}
	}

	/**
	 * Create a block in editor from master document
	 */
	private _createBlockFromMaster(blockId: string) {
		if (this.isDestroyed) return

		const childYdoc = this.dataMap.get(blockId)
		if (!childYdoc) {
			// Child doc doesn't exist yet, create placeholder
			this._createPlaceholderBlock(blockId)
			return
		}

		// Create placeholder block node
		const placeholderNode = this._createPlaceholderBlock(blockId)

		// Load child doc if not loaded
		if (!childYdoc.isLoaded) {
			childYdoc.load()
		}

		// Create binding
		this._createBlockBinding(blockId, childYdoc, placeholderNode)
	}

	/**
	 * Create a placeholder block node in editor
	 */
	private _createPlaceholderBlock(blockId: string): any {
		const schema = this.editor.schema
		const paragraph = schema.nodes.paragraph

		if (!paragraph) {
			console.error('Paragraph node type not found in schema')
			return null
		}

		// Create placeholder node with uuid attribute
		const placeholderNode = paragraph.create(
			{ uuid: blockId },
			schema.text('Loading...'),
		)

		// Insert at the end of document
		const tr = this.editorView.state.tr
		const docSize = this.editorView.state.doc.content.size
		tr.insert(docSize, placeholderNode)
		this.editorView.dispatch(tr)

		return placeholderNode
	}

	/**
	 * Create binding between child doc and block node
	 */
	private _createBlockBinding(blockId: string, childYdoc: Y.Doc, blockNode: any) {
		if (this.isDestroyed) return
		if (this.blockBindings.has(blockId)) {
			// Binding already exists
			return
		}

		// Find the actual block node in the document
		let actualBlockNode: any = null
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid === blockId) {
				actualBlockNode = node
			}
		})

		if (!actualBlockNode) {
			console.error(`Block node with uuid ${blockId} not found`)
			return
		}

		const binding = new BlockBinding(childYdoc, actualBlockNode, this.editorView)
		this.blockBindings.set(blockId, binding)
	}

	/**
	 * Handle master document changes
	 */
	private _masterDocChanged(events: Y.YEvent<any>[], transaction: Y.Transaction) {
		if (this.isDestroyed) return
		// Re-sync when master document changes
		this._syncMasterToEditor()
	}

	/**
	 * Handle editor changes
	 */
	private _editorChanged() {
		if (this.isDestroyed) return

		// Get current block IDs from editor
		const editorBlockIds = new Set<string>()
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid) {
				editorBlockIds.add(node.attrs.uuid)
			}
		})

		// Get master block IDs
		const masterBlockIds = new Set<string>()
		this.indexMap.forEach((index, blockId) => {
			masterBlockIds.add(blockId)
		})

		// Diff: new blocks in editor
		for (const blockId of editorBlockIds) {
			if (!masterBlockIds.has(blockId)) {
				this._handleNewBlock(blockId)
			}
		}

		// Diff: deleted blocks
		for (const blockId of masterBlockIds) {
			if (!editorBlockIds.has(blockId)) {
				this._handleDeletedBlock(blockId)
			}
		}

		// Diff: modified blocks
		for (const blockId of editorBlockIds) {
			if (masterBlockIds.has(blockId)) {
				this._handleModifiedBlock(blockId)
			}
		}
	}

	/**
	 * Handle new block in editor
	 */
	private _handleNewBlock(blockId: string) {
		if (this.isDestroyed) return

		// Find the block node
		let blockNode: any = null
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid === blockId) {
				blockNode = node
			}
		})

		if (!blockNode) return

		// Create new child doc
		const childYdoc = new Y.Doc({ guid: blockId })
		const fragment = childYdoc.getXmlFragment('default')

		// Initialize fragment from block node content
		const meta = { mapping: new Map(), isOMark: new Map() }
		childYdoc.transact(() => {
			// Convert block node to YXmlFragment
			this._prosemirrorNodeToYXmlFragment(blockNode, fragment, meta)
		}, this)

		// Add to master document
		const index = this.indexMap.size
		this.masterYdoc.transact(() => {
			this.indexMap.set(blockId, index)
			this.dataMap.set(blockId, childYdoc)
			childYdoc.load()
		}, this)

		// Create binding
		this._createBlockBinding(blockId, childYdoc, blockNode)
	}

	/**
	 * Handle deleted block
	 */
	private _handleDeletedBlock(blockId: string) {
		if (this.isDestroyed) return

		// Remove binding
		const binding = this.blockBindings.get(blockId)
		if (binding) {
			binding.destroy()
			this.blockBindings.delete(blockId)
		}

		// Remove from master document
		this.masterYdoc.transact(() => {
			this.indexMap.delete(blockId)
			const childYdoc = this.dataMap.get(blockId)
			if (childYdoc) {
				this.dataMap.delete(blockId)
				childYdoc.destroy()
			}
		}, this)
	}

	/**
	 * Handle modified block
	 */
	private _handleModifiedBlock(blockId: string) {
		if (this.isDestroyed) return

		const binding = this.blockBindings.get(blockId)
		if (!binding) return

		// Find the block node
		let blockNode: any = null
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid === blockId) {
				blockNode = node
			}
		})

		if (!blockNode) return

		// Update YXmlFragment from block node
		binding.updateYXmlFragment()
	}

	/**
	 * Traverse editor document
	 */
	private _traverseEditorDoc(
		callback: (node: any, pos: number) => void,
	) {
		const doc = this.editorView.state.doc
		let pos = 1

		const traverse = (node: any, offset: number) => {
			callback(node, offset)
			node.forEach((child: any, childOffset: number) => {
				traverse(child, offset + childOffset + 1)
			})
		}

		doc.forEach((child) => {
			traverse(child, pos)
			pos += child.nodeSize
		})
	}

	/**
	 * Convert ProseMirror node to YXmlFragment
	 * Simplified version
	 */
	private _prosemirrorNodeToYXmlFragment(
		node: any,
		fragment: Y.XmlFragment,
		meta: { mapping: Map<any, any>; isOMark: Map<any, any> },
	) {
		// This is a simplified version
		// In production, you should use the full y-prosemirror conversion logic
		if (node.isText) {
			const text = new Y.XmlText()
			text.insert(0, node.text)
			fragment.insert(0, [text])
		} else {
			const element = new Y.XmlElement(node.type.name)
			for (const key in node.attrs) {
				if (node.attrs[key] !== null) {
					element.setAttribute(key, node.attrs[key])
				}
			}
			node.forEach((child: any) => {
				const childFragment = new Y.XmlFragment()
				this._prosemirrorNodeToYXmlFragment(child, childFragment, meta)
				element.insert(element.length, [childFragment])
			})
			fragment.insert(fragment.length, [element])
		}
	}

	/**
	 * Get all block bindings
	 */
	public getBlockBindings(): Map<string, BlockBinding> {
		return this.blockBindings
	}

	/**
	 * Get child doc by block ID
	 */
	public getChildDoc(blockId: string): Y.Doc | undefined {
		return this.dataMap.get(blockId)
	}

	/**
	 * Destroy the binding
	 */
	public destroy() {
		if (this.isDestroyed) return
		this.isDestroyed = true

		// Destroy all block bindings
		for (const binding of this.blockBindings.values()) {
			binding.destroy()
		}
		this.blockBindings.clear()

		// Remove observers
		this.indexMap.unobserve(this._observeFunction)
		this.dataMap.unobserve(this._observeFunction)

		// Remove editor listener
		this.editor.off('update', this._editorChanged.bind(this))
	}
}

