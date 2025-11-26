import {Extension, removeDuplicates, findDuplicates} from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {combineTransactionSteps, findChildrenInRange} from "@tiptap/react";
import {getChangedRangesPlus, type NodeWithPos} from "./utils.ts";

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
	
	addOptions() {
		return {
			attributeName: 'uuid',
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
		}
	},

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
		const { types, attributeName } = this.options;
		const typeSet = new Set<string>(types);
		return [
			new Plugin({
				key: new PluginKey('uuid'),
				appendTransaction: (transactions, oldState, newState) => {
					
					// 协同更新，默认协同已处理数据
					if (transactions.some((tr) => tr.getMeta('y-sync')?.isChangeOrigin)) return;
					
					const docChanges =
						transactions.some((transaction) => transaction.docChanged) && !oldState.doc.eq(newState.doc);
					
					if (!docChanges) {
						return;
					}
					
					const { tr } = newState;
					const transform = combineTransactionSteps(oldState.doc, transactions);
					const { mapping } = transform;
					
					const changes = getChangedRangesPlus(transform);
					let newNodes: NodeWithPos[] = [];
					
					changes.forEach(({ newRange }) => {
						newNodes = newNodes.concat(
							findChildrenInRange(newState.doc, newRange, (node) => typeSet.has(node.type.name)),
						);
					});
					newNodes = removeDuplicates(newNodes, ({ pos }) => pos + '');
					
					const newIds = newNodes.map(({ node }) => node.attrs[attributeName]).filter((id) => id !== null);
					const duplicatedNewIds = findDuplicates(newIds);
					
					newNodes.forEach(({ node, pos }) => {
						pos = tr.mapping.map(pos);
						const id = tr.doc.nodeAt(pos)?.attrs[attributeName];
						if (id === null || id.length === 0) {
							tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								[attributeName]: generateUUID(),
							});
							return;
						}
						// check if the node doesn’t exist in the old state
						const { deleted } = mapping.invert().mapResult(pos);
						const newNode = deleted && duplicatedNewIds.includes(id);
						if (newNode) {
							tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								[attributeName]: generateUUID(),
							});
						}
					});
					
					if (!tr.steps.length) {
						return;
					}
					return tr;
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