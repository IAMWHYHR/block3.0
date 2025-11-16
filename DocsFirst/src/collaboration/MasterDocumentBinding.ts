import * as Y from 'yjs'
import { Editor } from '@tiptap/core'
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
	public readonly blockBindings: Map<string, BlockBinding> = new Map()
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

		console.log(`🔄 _createBlockFromMaster called for blockId: ${blockId}`)

		const childYdoc = this.dataMap.get(blockId)
		if (!childYdoc) {
			// Child doc doesn't exist yet, create placeholder
			console.log(`⚠️ ChildYdoc not found for blockId: ${blockId}, creating placeholder`)
			this._createPlaceholderBlock(blockId)
			return
		}

		console.log(`✅ Found childYdoc for blockId: ${blockId}`)

		// Create placeholder block node
		const placeholderNode = this._createPlaceholderBlock(blockId)
		if (!placeholderNode) {
			console.error(`❌ Failed to create placeholder block for blockId: ${blockId}`)
			return
		}

		console.log(`✅ Created placeholder block node with uuid: ${placeholderNode.attrs?.uuid}`)

		// Load child doc if not loaded
		if (!childYdoc.isLoaded) {
			childYdoc.load()
		}

		// Create binding with sync from fragment (master -> editor)
		// When master doc has new childYdoc but editor doesn't have the node,
		// we need to sync YXmlFragment content to the editor node
		this._createBlockBinding(blockId, childYdoc, placeholderNode, true)
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
	 * @param shouldSyncFromFragment - If true, sync YXmlFragment to block node (master -> editor)
	 *                                  If false, skip sync (editor -> master, editor node is already latest)
	 */
	private _createBlockBinding(
		blockId: string,
		childYdoc: Y.Doc,
		blockNode: any,
		shouldSyncFromFragment: boolean = true,
	) {
		if (this.isDestroyed) return
		if (this.blockBindings.has(blockId)) {
			// Binding already exists
			console.log(`⚠️ BlockBinding already exists for blockId: ${blockId}`)
			return
		}

		// First, try to use the provided blockNode if it has the correct uuid
		let actualBlockNode: any = null
		if (blockNode && blockNode.attrs && blockNode.attrs.uuid === blockId) {
			// Verify the node exists in the document by finding it
			this._traverseEditorDoc((node) => {
				if (node.attrs && node.attrs.uuid === blockId) {
					actualBlockNode = node
				}
			})
		}

		// If not found, search for it in the document
		if (!actualBlockNode) {
			this._traverseEditorDoc((node) => {
				if (node.attrs && node.attrs.uuid === blockId) {
					actualBlockNode = node
				}
			})
		}

		if (!actualBlockNode) {
			console.error(`❌ Block node with uuid ${blockId} not found in editor`)
			console.log('Available block nodes in editor:')
			this._traverseEditorDoc((node) => {
				if (node.attrs && node.attrs.uuid) {
					console.log(`  - uuid: ${node.attrs.uuid}, type: ${node.type.name}`)
				}
			})
			console.log('Available block IDs in masterYdoc:', Array.from(this.indexMap.keys()))
			console.log('Available childYdocs in masterYdoc:', Array.from(this.dataMap.keys()))
			return
		}

		const binding = new BlockBinding(
			childYdoc,
			actualBlockNode,
			this.editorView,
			shouldSyncFromFragment,
		)
		this.blockBindings.set(blockId, binding)
		console.log(`✅ Created BlockBinding for blockId: ${blockId}, total bindings: ${this.blockBindings.size}`)
		console.log(`🔍 blockBindings Map reference:`, this.blockBindings)
		console.log(`🔍 blockBindings entries:`, Array.from(this.blockBindings.entries()))
		
		// Force update window reference to ensure it's always current
		if ((window as any).collabEditor) {
			;(window as any).collabEditor.masterYdocBinding = this
			console.log(`✅ Updated window.collabEditor.masterYdocBinding reference`)
		}
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

		// Initialize fragment: create a single top-level YXmlElement
		const meta = { mapping: new Map(), isOMark: new Map() }
		childYdoc.transact(() => {
			// Create YXmlElement with blockNode.type.name as nodeName
			const xmlElement = new Y.XmlElement(blockNode.type.name)
			
			// Convert block node attributes and children to YXmlElement
			this._prosemirrorNodeToYXmlFragment(blockNode, xmlElement, meta)
			
			// Insert the YXmlElement into fragment (ensuring only one top-level element)
			fragment.insert(0, [xmlElement])
		}, this)

		// Add to master document
		const index = this.indexMap.size
		this.masterYdoc.transact(() => {
			this.indexMap.set(blockId, index)
			this.dataMap.set(blockId, childYdoc)
			childYdoc.load()
		}, this)

		// Create binding without sync from fragment (editor -> master)
		// When editor has new node but master doc doesn't have it,
		// editor node is already the latest, so no need to sync from fragment
		this._createBlockBinding(blockId, childYdoc, blockNode, false)
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

		// Find the updated block node
		let blockNode: any = null
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid === blockId) {
				blockNode = node
			}
		})

		if (!blockNode) return

		// Update YXmlFragment from the new block node
		// Pass the new blockNode to ensure we use the latest node reference
		binding.updateYXmlFragment(blockNode)
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
	 * Convert ProseMirror node to YXmlElement
	 * Updates the YXmlElement with node attributes and children
	 */
	private _prosemirrorNodeToYXmlFragment(
		node: any,
		xmlElement: Y.XmlElement,
		meta: { mapping: Map<any, any>; isOMark: Map<any, any> },
	) {
		// Update YXmlElement attributes from node attributes
		for (const key in node.attrs) {
			if (node.attrs[key] !== null && node.attrs[key] !== undefined) {
				xmlElement.setAttribute(key, String(node.attrs[key]))
			}
		}

		// Clear existing content to ensure clean update
		xmlElement.delete(0, xmlElement.length)

		// Process children (block nodes should have children, not be text nodes)
		if (node.isText) {
			// This branch should not be reached for block nodes,
			// but kept for robustness when processing inline text nodes
			const text = new Y.XmlText()
			if (node.text) {
				text.insert(0, node.text)
			}
			// Apply marks as formatting attributes on the text
			if (node.marks && node.marks.length > 0) {
				node.marks.forEach((mark: any) => {
					const markAttrs = mark.attrs || {}
					text.format(0, text.length, { [mark.type.name]: markAttrs })
				})
			}
			xmlElement.insert(0, [text])
		} else {
			// For block/inline nodes, recursively process children
			node.forEach((child: any) => {
				if (child.isText) {
					// Handle text child nodes
					const text = new Y.XmlText()
					if (child.text) {
						text.insert(0, child.text)
					}
					// Apply marks as formatting attributes
					if (child.marks && child.marks.length > 0) {
						child.marks.forEach((mark: any) => {
							const markAttrs = mark.attrs || {}
							text.format(0, text.length, { [mark.type.name]: markAttrs })
						})
					}
					xmlElement.insert(xmlElement.length, [text])
				} else {
					// Handle block/inline child nodes
					const childElement = new Y.XmlElement(child.type.name)
					// Recursively process child node to update its attributes and children
					this._prosemirrorNodeToYXmlFragment(child, childElement, meta)
					xmlElement.insert(xmlElement.length, [childElement])
				}
			})
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

