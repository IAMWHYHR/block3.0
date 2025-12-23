import * as Y from 'yjs'
import * as PModel from 'prosemirror-model'
import { EditorView } from 'prosemirror-view'
import {Editor} from "@tiptap/core";
import {getYDocManager} from "../masterChildDoc/ydoc-manager.ts";
// @ts-ignore
import {prosemirrorToYXmlFragment, prosemirrorJSONToYXmlFragment} from "../y-prosemirror";
import {yXmlFragmentToProsemirrorJSON} from "y-prosemirror";

/**
 * Binding between a child Y.Doc's YXmlFragment and a ProseMirror block node
 */
export class BlockBinding {
	public readonly childYdoc: Y.Doc
	public readonly fragment: Y.XmlFragment
	public readonly editorView: EditorView
	private readonly _observeFunction: (events: Y.YEvent<any>[], transaction: Y.Transaction) => void
	private isDestroyed = false
	private blockId: string
	private index: string
	public readonly editor: Editor
	public readonly masterYdoc: Y.Doc
	
	constructor(
		childYdoc: Y.Doc,
		blockId: string,
		editorView: EditorView,
		shouldSyncFromFragment: boolean = true,
		index: string,
		editor: Editor,
		masterYdoc: Y.Doc,
	) {
		this.childYdoc = childYdoc
		this.blockId = blockId
		this.index = index
		this.fragment = childYdoc.getXmlFragment('default')
		this.editorView = editorView
		this.editor = editor
		this.masterYdoc = masterYdoc
		this._observeFunction = this._fragmentChanged.bind(this)
		
		// Listen to fragment changes (必须在同步之前设置，以便监听后续变化)
		this.fragment.observeDeep(this._observeFunction)
		console.log(`👂 BlockBinding: observeDeep listener registered for blockId: ${this.blockId}, fragment.length: ${this.fragment.length}`)
		
		// 如果 childYdoc 还未加载，等待加载完成后再同步
		if (shouldSyncFromFragment) {
			// 主要检查 fragment 是否有内容，而不是依赖 isLoaded
			// 因为通过服务器同步的子文档，isLoaded 可能不会自动更新
			if (this.fragment.length > 0) {
				// fragment 有内容，立即同步
				// 延迟执行，确保 observeDeep 已经设置好
				setTimeout(() => {
					this._syncFragmentToNode()
				}, 0)
			} else {
				// fragment 为空，等待内容加载
				console.log(`📥 BlockBinding: fragment is empty, waiting for content for blockId: ${this.blockId}, isLoaded: ${childYdoc.isLoaded}`)
				this._waitForContentAndSync()
			}
		}
	}

	/**
	 * Wait for fragment content and then sync
	 * 主要检查 fragment 是否有内容，而不是依赖 isLoaded
	 */
	private _waitForContentAndSync() {
		if (this.isDestroyed) return
		
		// 如果 fragment 已经有内容，直接同步
		if (this.fragment.length > 0) {
			setTimeout(() => {
				this._syncFragmentToNode()
			}, 100)
			return
		}

		// 监听 childYdoc 的 update 事件，当有更新时检查是否需要同步
		const onUpdate = () => {
			if (this.isDestroyed) return
			
			// 检查 fragment 是否有内容
			if (this.fragment.length > 0) {
				console.log(`📥 BlockBinding: childYdoc update detected, fragment has content for blockId: ${this.blockId}`)
				// 延迟执行，确保内容已完全同步
				setTimeout(() => {
					this._syncFragmentToNode()
				}, 50)
			}
		}

		// 监听 update 事件
		this.childYdoc.on('update', onUpdate)

		// 定期检查 fragment 是否有内容
		const checkInterval = setInterval(() => {
			if (this.isDestroyed) {
				clearInterval(checkInterval)
				this.childYdoc.off('update', onUpdate)
				return
			}
			
			// 检查 fragment 是否有内容（主要判断标准）
			if (this.fragment.length > 0) {
				clearInterval(checkInterval)
				this.childYdoc.off('update', onUpdate)
				// 延迟执行，确保内容已同步
				setTimeout(() => {
					this._syncFragmentToNode()
				}, 100)
			}
		}, 100)

		// 设置超时，避免无限等待
		setTimeout(() => {
			clearInterval(checkInterval)
			this.childYdoc.off('update', onUpdate)
			// 超时后，即使 fragment 为空也尝试同步一次（可能是空内容）
			if (this.fragment.length === 0) {
				console.log(`⚠️ BlockBinding: timeout waiting for content for blockId: ${this.blockId}, fragment still empty`)
			}
		}, 5000)
	}

	/**
	 * Sync YXmlFragment content to the block node
	 */
	private _syncFragmentToNode() {
		if (this.isDestroyed) return
		
		console.log(`🔄 BlockBinding._syncFragmentToNode called for blockId: ${this.blockId}, fragment.length: ${this.fragment.length}, isLoaded: ${this.childYdoc.isLoaded}`)
		
		// 检查 fragment 是否有内容（主要判断标准）
		// 不再严格依赖 isLoaded，因为通过服务器同步的子文档，isLoaded 可能不会自动更新
		if (this.fragment.length === 0) {
			console.log(`⚠️ BlockBinding: fragment is empty for blockId: ${this.blockId}, skipping sync`)
			return
		}

		// 转换 fragment 为 ProseMirror JSON
		const jsonDoc = yXmlFragmentToProsemirrorJSON(this.fragment)
		if (!jsonDoc || !jsonDoc.content || jsonDoc.content.length === 0) {
			console.log(`⚠️ BlockBinding: no content in fragment for blockId: ${this.blockId}, skipping sync`)
			return
		}

		const data = jsonDoc.content[0]
		if (!data || !data.type) {
			console.error(`❌ BlockBinding: invalid node data for blockId: ${this.blockId}`, data)
			return
		}

		try {
			const node = PModel.Node.fromJSON(this.editor.schema, data)
			const pos = this._findBlockNodePosition(this.blockId, this.index)
			const tr = this.editorView.state.tr

			// 如果节点已存在，替换；否则插入
			if (pos.nodeExists) {
				console.log(`🔄 BlockBinding: replacing existing node at position ${pos.from}-${pos.to} for blockId: ${this.blockId}`)
				tr.replaceWith(pos.from, pos.to, node)
			} else {
				console.log(`🔄 BlockBinding: inserting new node at position ${pos.from} for blockId: ${this.blockId}`)
				tr.insert(pos.from, node)
			}
			
			tr.setMeta('yjsSync', true)
			this.editorView.dispatch(tr)
			console.log(`✅ BlockBinding: successfully synced fragment to node for blockId: ${this.blockId}`)
		} catch (error) {
			console.error(`❌ BlockBinding: failed to sync fragment to node for blockId: ${this.blockId}`, error)
			console.error('Fragment data:', data)
		}
	}

	/**
	 * Find the position of the block node in the document
	 */
	private _findBlockNodePosition(blockId: string, index: string): {from: number, to: number, nodeExists: boolean} {
		const doc = this.editorView.state.doc
		const indexMap = getYDocManager(this.masterYdoc).getindeMap()
		
		// 默认位置：文档末尾（用于插入）
		let insertPos = 1 // 跳过 doc 节点
		let nodeExists = false
		let nodeStart = 0
		let nodeEnd = 0
		
		// 遍历文档查找节点
		doc.forEach((node, offset) => {
			const uuid = node.attrs?.uuid
			
			// 如果找到匹配的节点
			if (uuid === blockId) {
				nodeExists = true
				nodeStart = offset
				nodeEnd = offset + node.nodeSize
				return
			}
			
			// 如果节点不存在，找到应该插入的位置（按 index 排序）
			if (!nodeExists && uuid) {
				const nodeIndex = indexMap.get(uuid)
				if (nodeIndex !== undefined && nodeIndex > index) {
					// 找到第一个 index 大于当前 index 的节点，插入到它之前
					insertPos = offset
					return
				}
			}
			
			// 更新插入位置（如果还没找到插入点）
			if (!nodeExists) {
				insertPos = offset + node.nodeSize
			}
		})

		if (nodeExists) {
			return { from: nodeStart, to: nodeEnd, nodeExists: true }
		} else {
			// 确保插入位置有效
			if (insertPos < 1) {
				insertPos = 1
			}
			return { from: insertPos, to: insertPos, nodeExists: false }
		}
	}

	/**
	 * Handle YXmlFragment changes
	 */
	private _fragmentChanged(events: Y.YEvent<any>[], transaction: Y.Transaction) {
		if (this.isDestroyed) return
		if(transaction.origin === 'bendi') {
			return;
		}
		if (events.length === 0) return
		
		console.log(`🔄 BlockBinding._fragmentChanged triggered for blockId: ${this.blockId}, events: ${events.length}, origin:`, transaction.origin)
		this._syncFragmentToNode()
	}
	
	/**
	 * Update YXmlFragment from block node content
	 * @param blockNode - Optional new block node to use. If not provided, uses this.blockNode
	 */
	public updateYXmlFragment() {
		if (this.isDestroyed) return
		
		// 查找对应的 block node
		let blockNode: PModel.Node | null = null
		this.editorView.state.doc.content.forEach((node) => {
			if (node.attrs?.uuid === this.blockId) {
				blockNode = node
			}
		})

		if (!blockNode) {
			console.warn(`⚠️ BlockBinding: block node not found for blockId: ${this.blockId}`)
			return
		}
		
		this.childYdoc.transact(() => {
			try {
				prosemirrorJSONToYXmlFragment(this.editor.schema, {type:'doc', content: [blockNode.toJSON(),]}, this.fragment)
			} catch (error) {
				console.error('❌ updateYFragment error:', error)
				throw error
			}
		}, 'bendi')
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