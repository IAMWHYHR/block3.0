import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * 生成全局唯一的 UUID
 */
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

/**
 * 检查节点是否为 block 节点
 */
function isBlockNode(node: ProseMirrorNode): boolean {
	return node.isBlock && !node.isText
}

/**
 * UUID 扩展
 * 为所有 block 节点添加 uuid 属性，并在创建时自动分配
 */
export const UuidExtension = Extension.create({
	name: 'uuid',

	/**
	 * 为所有 block 节点添加 uuid 属性
	 */
	addGlobalAttributes() {
		return [
			{
				types: [
					'paragraph',
					'heading',
					'blockquote',
					'codeBlock',
					'horizontalRule',
					'orderedList',
					'bulletList',
					'listItem',
				],
				attributes: {
					uuid: {
						default: null,
						parseHTML: (element) => element.getAttribute('data-uuid'),
						renderHTML: (attributes) => {
							if (!attributes.uuid) {
								return {}
							}
							return {
								'data-uuid': attributes.uuid,
							}
						},
					},
				},
			},
		]
	},

	/**
	 * 添加插件来处理节点创建时的 UUID 分配
	 */
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('uuid'),
				appendTransaction(transactions, oldState, newState) {
					// 检查是否有文档变更
					if (!transactions.some((tr) => tr.docChanged)) {
						return null
					}

					let tr = null
					let modified = false

					// 遍历文档，为没有 UUID 的 block 节点分配 UUID
					newState.doc.descendants((node, pos) => {
						if (isBlockNode(node) && !node.attrs.uuid) {
							if (!tr) {
								tr = newState.tr
							}
							tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								uuid: generateUUID(),
							})
							modified = true
						}
					})

					return modified && tr ? tr : null
				},
			}),
		]
	},

	/**
	 * 在编辑器创建后，为现有节点分配 UUID
	 */
	onCreate() {
		// 当编辑器创建时，为现有节点分配 UUID
		this.editor.on('create', ({ editor }) => {
			setTimeout(() => {
				const { tr } = editor.state
				let modified = false

				editor.state.doc.descendants((node, pos) => {
					if (isBlockNode(node) && !node.attrs.uuid) {
						tr.setNodeMarkup(pos, undefined, {
							...node.attrs,
							uuid: generateUUID(),
						})
						modified = true
					}
				})

				if (modified) {
					editor.view.dispatch(tr)
				}
			}, 0)
		})
	},
})

