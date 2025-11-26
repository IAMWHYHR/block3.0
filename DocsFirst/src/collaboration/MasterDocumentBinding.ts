import * as Y from 'yjs'
import { Editor } from '@tiptap/core'
import { BlockBinding } from './BlockBinding.js'
import { EditorView } from 'prosemirror-view'
import {getYDocManager} from "../masterChildDoc/ydoc-manager.ts";
// @ts-ignore
import {prosemirrorToYXmlFragment} from "../y-prosemirror";

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
	private isInitializing = true
	private syncTimeout: ReturnType<typeof setTimeout> | null = null

	constructor(masterYdoc: Y.Doc, editor: Editor) {
		this.masterYdoc = masterYdoc
		this.editor = editor
		this.editorView = editor.view

		// Initialize maps
		this.indexMap = masterYdoc.getMap('index')
		this.dataMap = masterYdoc.getMap('data')

		this._observeFunction = this._masterDocChanged.bind(this)

		// Listen to master document changes
		this.indexMap.observeDeep(this._observeFunction)

		// Initial sync
		this._syncMasterToEditor()

		// Mark initialization as complete after a delay
		// This allows the initial sync to complete before handling changes
		setTimeout(() => {
			this.isInitializing = false
			console.log('✅ MasterDocumentBinding initialization complete')
		}, 1000)

		// Listen to editor changes
		this.editor.on('update', this._editorChanged.bind(this))
	}

	/**
	 * Sync master document to editor
	 */
	private _syncMasterToEditor() {
		if (this.isDestroyed) return
		
		// 获取所有 childDocId
		const indices = getYDocManager(this.masterYdoc).getIndex()
		console.log(`🔄 _syncMasterToEditor called, found ${indices.length} blocks`)
		
		// 如果数据为空，可能是还在同步中，不执行同步
		if (indices.length === 0) {
			console.log(`⚠️ _syncMasterToEditor: no blocks found, skipping sync (may be still syncing)`)
			return
		}
		
		// 遍历创建 block
		indices.forEach(s => this._createBlockFromMaster(s))
	}

	/**
	 * Create a block in editor from master document
	 */
	private _createBlockFromMaster({uuid, index}: {uuid:string, index:string}) {
		if (this.isDestroyed) return
		console.log(`🔄 _createBlockFromMaster called for blockId: ${uuid}`)
		const childYdoc = getYDocManager(this.masterYdoc).getSubDoc(uuid);
		if(!childYdoc) return;
		
		// 尝试加载子文档（如果还未加载）
		// 注意：即使 isLoaded 为 false，如果 fragment 有内容，BlockBinding 也会同步
		if (!childYdoc.isLoaded) {
			try {
				childYdoc.load()
				console.log(`📥 Loaded childYdoc for blockId: ${uuid}`)
			} catch (error) {
				console.warn(`⚠️ Failed to load childYdoc for blockId: ${uuid}`, error)
				// 继续执行，BlockBinding 会检查 fragment 内容
			}
		}
		
		this._createBlockBinding(uuid, childYdoc, true, index)
	}
	
	/**
	 * Create binding between child doc and block node
	 * @param blockId
	 * @param childYdoc
	 * @param blockNode
	 * @param shouldSyncFromFragment - If true, sync YXmlFragment to block node (master -> editor)
	 *                                  If false, skip sync (editor -> master, editor node is already latest)
	 * @param index
	 */
	private _createBlockBinding(
		blockId: string,
		childYdoc: Y.Doc,
		shouldSyncFromFragment: boolean = false,
		index: string,
	) {
		if (this.isDestroyed) return
		if (this.blockBindings.has(blockId)) {
			console.log(`⚠️ BlockBinding already exists for blockId: ${blockId}`)
			return
		}
		
		const binding = new BlockBinding(
			childYdoc,
			blockId,
			this.editorView,
			shouldSyncFromFragment,
			index,
			this.editor,
			this.masterYdoc,
		)
		this.blockBindings.set(blockId, binding)
		console.log(`✅ Created BlockBinding for blockId: ${blockId}, total bindings: ${this.blockBindings.size}`)
		
		if ((window as any).collabEditor) {
			;(window as any).collabEditor.masterYdocBinding = this
			console.log(`✅ Updated window.collabEditor.masterYdocBinding reference`)
		}
	}

	/**
	 * Handle master document changes
	 */
	private _masterDocChanged() {
		if (this.isDestroyed) return
		
		// 在初始化期间，避免频繁触发同步
		// 只在初始化完成后才响应变化
		if (this.isInitializing) {
			console.log(`⚠️ _masterDocChanged: still initializing, skipping sync`)
			return
		}
		
		// 使用防抖，避免频繁同步
		if (this.syncTimeout) {
			clearTimeout(this.syncTimeout)
		}
		
		this.syncTimeout = setTimeout(() => {
			this._syncMasterToEditor()
		}, 100)
	}

	/**
	 * Handle editor changes
	 */
	private _editorChanged() {
		if (this.isDestroyed) return
		
		// 在初始化期间，避免处理编辑器变化
		// 因为此时编辑器可能还没有内容，会导致误判删除
		if (this.isInitializing) {
			console.log(`⚠️ _editorChanged: still initializing, skipping editor change handling`)
			return
		}

		// Get current block IDs from editor
		const editorBlockIds = new Set<string>()
		this._traverseEditorDoc((node) => {
			if (node.attrs && node.attrs.uuid) {
				editorBlockIds.add(node.attrs.uuid)
			}
		})

		// Get master block IDs
		const masterBlockIds = new Set<string>()
		this.indexMap.forEach((_, blockId) => {
			masterBlockIds.add(blockId)
		})

		// 如果 master 中没有任何 block，可能是还在同步中，不处理删除
		if (masterBlockIds.size === 0) {
			console.log(`⚠️ _editorChanged: master has no blocks, skipping diff (may be still syncing)`)
			// 只处理新增的 block
			for (const blockId of editorBlockIds) {
				this._handleNewBlock(blockId)
			}
			return
		}

		// Diff: new blocks in editor
		for (const blockId of editorBlockIds) {
			if (!masterBlockIds.has(blockId)) {
				this._handleNewBlock(blockId)
			}
		}

		// Diff: deleted blocks
		// 只有在 master 有数据且编辑器有数据时才处理删除
		// 避免在初始化期间误判删除
		if (editorBlockIds.size > 0) {
			for (const blockId of masterBlockIds) {
				if (!editorBlockIds.has(blockId)) {
					this._handleDeletedBlock(blockId)
				}
			}
		}

		// Diff: modified blocks
		this.masterYdoc.transact(()=>{
			for (const blockId of editorBlockIds) {
				if (masterBlockIds.has(blockId)) {
					this._handleModifiedBlock(blockId)
				}
			}
		}, this)
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
		let childYdoc = getYDocManager(this.masterYdoc).getSubDoc( blockId );
		if (!childYdoc) {
			childYdoc = new Y.Doc({ guid: blockId });
		}
		const fragment = childYdoc.getXmlFragment('default')

		// Initialize fragment: create a single top-level YXmlElement
		childYdoc.transact(() => {
			prosemirrorToYXmlFragment(blockNode, fragment)
		}, this)

		// Add to master document
		const index = this.indexMap.size
		this.masterYdoc.transact(() => {
			this.indexMap.set(blockId, index)
			this.masterYdoc.getMap('data').set(blockId, childYdoc);
			childYdoc.load()
		}, this)
		
		this._createBlockBinding(blockId, childYdoc, false, '0')
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
		
		// Update YXmlFragment from the new block node
		// Pass the new blockNode to ensure we use the latest node reference
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
		
		if (this.syncTimeout) {
			clearTimeout(this.syncTimeout)
			this.syncTimeout = null
		}
		
		for (const binding of this.blockBindings.values()) {
			binding.destroy()
		}
		this.blockBindings.clear()
		
		;(this.indexMap as any).unobserveDeep(this._observeFunction)
		
		this.editor.off('update', this._editorChanged.bind(this))
	}
}