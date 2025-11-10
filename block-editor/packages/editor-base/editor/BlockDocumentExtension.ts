import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import * as Y from 'yjs';

// 块文档管理器
class BlockDocumentManager {
  private masterYdoc: Y.Doc;
  private masterIndex: Y.Map<string>;
  private masterData: Y.Map<string>; // 存储子文档的 GUID，而不是 Y.Doc 对象
  private blockIdMap: Map<string, string> = new Map(); // ProseMirror node -> block_id
  private childDocMap: Map<string, Y.Doc> = new Map(); // block_id -> childYdoc (本地缓存)

  constructor(masterYdoc: Y.Doc) {
    this.masterYdoc = masterYdoc;
    this.masterIndex = masterYdoc.getMap('index');
    this.masterData = masterYdoc.getMap('data') as Y.Map<string>; // 存储 GUID

    // 监听 masterData 的变化，同步子文档（从 GUID 加载）
    this.masterData.observe((event: Y.YMapEvent<string>) => {
      event.keysChanged.forEach((blockId: string) => {
        if (this.masterData.has(blockId)) {
          const childDocGuid = this.masterData.get(blockId);
          if (childDocGuid && !this.childDocMap.has(blockId)) {
            // 从 subdocs 中查找对应的子文档
            let foundChildDoc: Y.Doc | null = null;
            this.masterYdoc.subdocs.forEach((doc: Y.Doc) => {
              if (doc.guid === childDocGuid) {
                foundChildDoc = doc;
              }
            });
            
            if (foundChildDoc) {
              this.childDocMap.set(blockId, foundChildDoc);
              // 确保子文档已加载（如果支持 load 方法）
              if (typeof (foundChildDoc as any).load === 'function') {
                try {
                  (foundChildDoc as any).load();
                } catch (e) {
                  // load 可能已经调用过或不需要
                }
              }
              console.log(`📦 加载子文档: ${blockId}, GUID: ${childDocGuid}`);
            } else {
              console.warn(`⚠️ 子文档 GUID 存在但未在 subdocs 中找到: ${blockId}, GUID: ${childDocGuid}`);
            }
          }
        } else {
          // 子文档被删除
          const childYdoc = this.childDocMap.get(blockId);
          if (childYdoc) {
            this.childDocMap.delete(blockId);
            console.log(`🗑️ 删除子文档: ${blockId}`);
          }
        }
      });
    });

    // 监听子文档的加载
    this.masterYdoc.on('subdocs', (subdocs: { added: Set<Y.Doc>; removed: Set<Y.Doc> }) => {
      subdocs.added.forEach((childYdoc: Y.Doc) => {
        console.log(`📥 子文档已加载: ${childYdoc.guid}`);
      });
      subdocs.removed.forEach((childYdoc: Y.Doc) => {
        console.log(`📤 子文档已移除: ${childYdoc.guid}`);
      });
    });
  }

  // 生成 block_id
  private generateBlockId(): string {
    return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // 为第一层节点创建或获取子文档
  getOrCreateChildDoc(node: any, fractionalIndex: string): { blockId: string; childYdoc: Y.Doc } {
    // 使用节点的位置作为临时 key 来查找已有的 blockId
    const nodeKey = `${node.type.name}-${node.content.size}`;
    
    // 检查是否已有对应的 blockId（根据 fractionalIndex 查找）
    let blockId: string | undefined;
    
    // 从 index map 中查找是否有相同 fractionalIndex 的 block
    this.masterIndex.forEach((idx, bid) => {
      if (idx === fractionalIndex) {
        blockId = bid;
      }
    });

    // 如果没有找到，生成新的 blockId
    if (!blockId) {
      blockId = this.generateBlockId();
    }

    // 获取或创建子文档
    let childYdoc: Y.Doc;
    
    if (this.masterData.has(blockId)) {
      // 从本地缓存或 subdocs 中获取已有子文档
      const childDocGuid = this.masterData.get(blockId);
      
      if (!childDocGuid) {
        // GUID 不存在，创建新文档
        childYdoc = new Y.Doc();
        this.masterYdoc.subdocs.add(childYdoc);
        if (typeof (childYdoc as any).load === 'function') {
           try {
            (childYdoc as any).load();
          } catch (e) {
            // 忽略错误
          }
        }
        this.masterData.set(blockId, childYdoc.guid);
        this.masterIndex.set(blockId, fractionalIndex);
        this.childDocMap.set(blockId, childYdoc);
        console.log(`🆕 创建子文档（修复）: ${blockId}, GUID: ${childYdoc.guid}`);
        return { blockId, childYdoc };
      }
      
      // 先检查本地缓存
      if (this.childDocMap.has(blockId)) {
        childYdoc = this.childDocMap.get(blockId)!;
      } else if (childDocGuid) {
        // 从 subdocs 中查找（childDocGuid 已确认不为 undefined）
        const guidToFind = childDocGuid as string; // 类型断言，确保不是 undefined
        const blockIdForMap = blockId; // 确保 blockId 是 string 类型
        let foundDoc: Y.Doc | null = null;
        this.masterYdoc.subdocs.forEach((doc: Y.Doc) => {
          if (doc.guid === guidToFind) {
            foundDoc = doc;
            this.childDocMap.set(blockIdForMap, doc);
            if (typeof (doc as any).load === 'function') {
              try {
                (doc as any).load();
              } catch (e) {
                // 忽略错误
              }
            }
          }
        });
        
        if (foundDoc) {
          childYdoc = foundDoc;
        } else {
          // 如果没找到，创建一个新的（这种情况不应该发生，但为了安全）
          console.warn(`⚠️ 子文档 GUID ${childDocGuid} 在 subdocs 中不存在，创建新文档`);
          childYdoc = new Y.Doc();
          this.masterYdoc.subdocs.add(childYdoc);
          if (typeof (childYdoc as any).load === 'function') {
            try {
              (childYdoc as any).load();
            } catch (e) {
              // 忽略错误
            }
          }
          this.masterData.set(blockId, childYdoc.guid);
        }
      } else {
        // childDocGuid 为 undefined 的情况（不应该发生，但为了安全）
        console.warn(`⚠️ blockId ${blockId} 在 data Map 中但没有 GUID，创建新文档`);
        childYdoc = new Y.Doc();
        this.masterYdoc.subdocs.add(childYdoc);
        if (typeof (childYdoc as any).load === 'function') {
          try {
            (childYdoc as any).load();
          } catch (e) {
            // 忽略错误
          }
        }
        this.masterData.set(blockId, childYdoc.guid);
        this.masterIndex.set(blockId, fractionalIndex);
        this.childDocMap.set(blockId, childYdoc);
      }
    } else {
      // 创建新的子文档
      childYdoc = new Y.Doc();
      
      // 初始化子文档的 default YXMLFragment
      const defaultFragment = childYdoc.get('default', Y.XmlFragment);
      
      // 先将子文档添加到 subdocs（必须在存储 GUID 之前）
      this.masterYdoc.subdocs.add(childYdoc);
      
      // 加载子文档（如果支持）
      if (typeof (childYdoc as any).load === 'function') {
        try {
          (childYdoc as any).load();
        } catch (e) {
          // 忽略错误
        }
      }
      
      // 将子文档的 GUID 存储到主文档的 data Map（而不是文档对象本身）
      this.masterData.set(blockId, childYdoc.guid);
      
      // 将 block_id 映射到 fractionalIndex
      this.masterIndex.set(blockId, fractionalIndex);
      
      console.log(`🆕 创建子文档: ${blockId}, GUID: ${childYdoc.guid}, fractionalIndex: ${fractionalIndex}`);
      console.log(`  - 已添加到 subdocs: ${this.masterYdoc.subdocs.has(childYdoc)}`);
      console.log(`  - 当前 subdocs 数量: ${this.masterYdoc.subdocs.size}`);
    }

    // 缓存映射关系
    this.blockIdMap.set(nodeKey, blockId);
    if (!this.childDocMap.has(blockId)) {
      this.childDocMap.set(blockId, childYdoc);
    }

    return { blockId, childYdoc };
  }

  // 获取子文档的 default YXMLFragment
  getChildDefaultFragment(blockId: string): Y.XmlFragment | null {
    const childYdoc = this.childDocMap.get(blockId);
    if (!childYdoc) {
      return null;
    }
    return childYdoc.get('default', Y.XmlFragment);
  }

  // 删除子文档
  removeChildDoc(blockId: string): void {
    const childYdoc = this.childDocMap.get(blockId);
    if (childYdoc) {
      // 从主文档的 data Map 中删除 GUID
      this.masterData.delete(blockId);
      this.masterIndex.delete(blockId);
      // 从 subdocs 中删除
      this.masterYdoc.subdocs.delete(childYdoc);
      // 从本地缓存中删除
      this.childDocMap.delete(blockId);
      // 销毁子文档
      childYdoc.destroy();
      console.log(`🗑️ 移除子文档: ${blockId}, GUID: ${childYdoc.guid}`);
    } else {
      // 如果本地缓存中没有，尝试从 GUID 查找
      const childDocGuid = this.masterData.get(blockId);
      if (childDocGuid) {
        this.masterYdoc.subdocs.forEach((doc: Y.Doc) => {
          if (doc.guid === childDocGuid) {
            this.masterYdoc.subdocs.delete(doc);
            doc.destroy();
          }
        });
        this.masterData.delete(blockId);
        this.masterIndex.delete(blockId);
        console.log(`🗑️ 移除子文档（通过 GUID）: ${blockId}, GUID: ${childDocGuid}`);
      }
    }
  }

  // 获取所有子文档
  getAllChildDocs(): Map<string, Y.Doc> {
    return new Map(this.childDocMap);
  }
}

// 块文档扩展
export const BlockDocumentExtension = Extension.create({
  name: 'blockDocument',

  addStorage() {
    return {
      blockManager: null as BlockDocumentManager | null,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: new PluginKey('blockDocument'),
        
        view(editorView: EditorView) {
          const blockManager = extension.storage.blockManager;
          
          if (!blockManager) {
            return {};
          }

          // 监听文档变化，更新子文档结构
          const updateBlockDocs = (view: EditorView) => {
            if (!blockManager) return;

            const { doc } = view.state;
            
            // 获取第一层节点（直接子节点，doc 的直接子节点）
            const firstLevelNodes: Array<{ node: any; pos: number; index: number }> = [];
            let index = 0;
            doc.forEach((node: any, pos: number) => {
              if (node.isBlock && node.type.name !== 'doc') {
                firstLevelNodes.push({ node, pos, index });
                index++;
              }
            });

            // 为每个第一层节点确保有对应的子文档
            firstLevelNodes.forEach(({ node, pos, index: nodeIndex }) => {
              // 使用 fractional index (简化实现，使用位置作为索引)
              // 实际应该使用 fractional-index 库来生成正确的索引
              const fractionalIndex = `a${nodeIndex.toString().padStart(10, '0')}`;
              
              try {
                const { blockId, childYdoc } = blockManager.getOrCreateChildDoc(node, fractionalIndex);
                
                // 获取子文档的 default YXMLFragment
                const defaultFragment = blockManager.getChildDefaultFragment(blockId);
                
                // 这里可以将子文档的内容绑定到节点
                // 注意：这是一个复杂的过程，需要将 ProseMirror 节点内容同步到 YXMLFragment
                // 实际实现可能需要使用 y-prosemirror 的绑定机制
                
              } catch (error) {
                console.error(`❌ 创建子文档失败:`, error);
              }
            });

            if (firstLevelNodes.length > 0) {
              console.log(`📊 更新块文档结构: ${firstLevelNodes.length} 个第一层节点`);
              
              // 调试：检查数据存储情况
              const masterYdoc = blockManager['masterYdoc'];
              const masterData = masterYdoc.getMap('data');
              const masterIndex = masterYdoc.getMap('index');
              
              console.log(`📋 主文档数据检查:`);
              console.log(`  - data Map 大小: ${masterData.size}`);
              console.log(`  - index Map 大小: ${masterIndex.size}`);
              console.log(`  - subdocs 数量: ${masterYdoc.subdocs.size}`);
              
              if (masterData.size > 0) {
                console.log(`  - data Map 内容:`, Array.from(masterData.entries()));
              }
              if (masterIndex.size > 0) {
                console.log(`  - index Map 内容:`, Array.from(masterIndex.entries()));
              }
              
              // 列出所有 subdocs
              const subdocGuids: string[] = [];
              masterYdoc.subdocs.forEach((doc: Y.Doc) => {
                subdocGuids.push(doc.guid);
              });
              if (subdocGuids.length > 0) {
                console.log(`  - subdocs GUIDs:`, subdocGuids);
              }
            }
          };

          // 初始化时更新
          updateBlockDocs(editorView);

          // 返回插件视图接口
          return {
            update: (view: EditorView, prevState: any) => {
              // 只在文档结构发生变化时更新
              if (view.state.doc !== prevState.doc) {
                updateBlockDocs(view);
              }
            },
            destroy: () => {
              console.log('🧹 BlockDocument plugin view 已销毁');
            },
          };
        },
      }),
    ];
  },

  onCreate() {
    // 从 Collaboration 扩展中获取 ydoc
    const editor = this.editor;
    
    // 尝试从 editor 的 extensions 中找到 Collaboration 扩展
    const collaborationExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'collaboration'
    );
    
    // TipTap Collaboration 扩展会将 document 存储在 options 中
    let masterYdoc: Y.Doc | null = null;
    
    if (collaborationExt) {
      // 尝试多种方式获取 document
      masterYdoc = (collaborationExt as any).options?.document || 
                   (collaborationExt as any).storage?.document ||
                   (collaborationExt as any).props?.document;
    }
    
    // 如果还是找不到，尝试从 editor 实例中获取
    if (!masterYdoc && (editor as any).collaboration?.document) {
      masterYdoc = (editor as any).collaboration.document;
    }
    
    if (masterYdoc) {
      const blockManager = new BlockDocumentManager(masterYdoc);
      this.storage.blockManager = blockManager;
      console.log('✅ BlockDocumentExtension 已初始化，主文档:', masterYdoc.guid);
      console.log('📋 主文档结构:');
      console.log('  - index:', !!masterYdoc.getMap('index'));
      console.log('  - data:', !!masterYdoc.getMap('data'));
    } else {
      console.warn('⚠️ BlockDocumentExtension: 未找到 Collaboration 扩展或 document');
      console.warn('   可用的扩展:', editor.extensionManager.extensions.map(e => e.name));
    }
  },

  onDestroy() {
    if (this.storage.blockManager) {
      // 清理所有子文档
      const allChildDocs = this.storage.blockManager.getAllChildDocs();
      allChildDocs.forEach((_childYdoc: Y.Doc, blockId: string) => {
        this.storage.blockManager?.removeChildDoc(blockId);
      });
      console.log('🧹 BlockDocumentExtension 已清理');
    }
  },
});

