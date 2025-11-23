import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as Y from 'yjs';
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs';
import type Document from './Document.ts';

/**
 * 文档存储管理器
 * 用于存储和加载 masterYDoc 和 childYDoc
 */
export class DocumentStorage {
  private storageDir: string;

  constructor(storageDir: string = './storage/documents') {
    this.storageDir = storageDir;
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      // 如果目录已存在，忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 获取主文档的存储路径
   */
  private getMasterDocPath(documentName: string): string {
    // 将文档名转换为安全的文件名
    const safeName = documentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${safeName}.ydoc`);
  }

  /**
   * 获取子文档的存储路径
   */
  private getChildDocPath(documentName: string, childGuid: string): string {
    const safeName = documentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeGuid = childGuid.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${safeName}_child_${safeGuid}.ydoc`);
  }

  /**
   * 存储主文档
   */
  async storeMasterDocument(document: Document): Promise<void> {
    await this.ensureStorageDir();
    
    const documentName = document.name;
    const masterUpdate = encodeStateAsUpdate(document);
    const masterPath = this.getMasterDocPath(documentName);

    try {
      await fs.writeFile(masterPath, masterUpdate);
      console.log(`💾 已存储主文档: ${documentName} (${masterUpdate.length} bytes)`);
    } catch (error) {
      console.error(`❌ 存储主文档失败: ${documentName}`, error);
      throw error;
    }
  }

  /**
   * 存储所有子文档
   */
  async storeChildDocuments(document: Document): Promise<void> {
    await this.ensureStorageDir();
    
    const documentName = document.name;
    const subdocs = document.subdocs;

    // 存储每个子文档
    const storePromises: Promise<void>[] = [];
    
    subdocs.forEach((childDoc) => {
      const childGuid = childDoc.guid;
      const childUpdate = encodeStateAsUpdate(childDoc);
      const childPath = this.getChildDocPath(documentName, childGuid);

      const storePromise = fs
        .writeFile(childPath, childUpdate)
        .then(() => {
          console.log(`💾 已存储子文档: ${documentName}/${childGuid} (${childUpdate.length} bytes)`);
        })
        .catch((error) => {
          console.error(`❌ 存储子文档失败: ${documentName}/${childGuid}`, error);
          throw error;
        });

      storePromises.push(storePromise);
    });

    await Promise.all(storePromises);
    
    if (subdocs.size > 0) {
      console.log(`💾 已存储 ${subdocs.size} 个子文档: ${documentName}`);
    }
  }

  /**
   * 存储主文档和所有子文档
   */
  async storeDocument(document: Document): Promise<void> {
    try {
      await this.storeMasterDocument(document);
      await this.storeChildDocuments(document);
      console.log(`✅ 文档存储完成: ${document.name}`);
    } catch (error) {
      console.error(`❌ 文档存储失败: ${document.name}`, error);
      throw error;
    }
  }

  /**
   * 从存储加载主文档
   */
  async loadMasterDocument(documentName: string, targetDoc: Document): Promise<boolean> {
    const masterPath = this.getMasterDocPath(documentName);

    try {
      const masterUpdate = await fs.readFile(masterPath);
      
      if (masterUpdate.length > 0) {
        applyUpdate(targetDoc, masterUpdate);
        console.log(`📄 已加载主文档: ${documentName} (${masterUpdate.length} bytes)`);
        return true;
      }
      
      return false;
    } catch (error) {
      // 文件不存在时返回 false，表示需要创建新文档
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`📄 主文档不存在，将创建新文档: ${documentName}`);
        return false;
      }
      
      console.error(`❌ 加载主文档失败: ${documentName}`, error);
      throw error;
    }
  }

  /**
   * 从存储加载所有子文档
   * 修复 dataMap 中被序列化为 GUID 字符串的 Y.Doc 对象
   */
  async loadChildDocuments(document: Document): Promise<void> {
    const documentName = document.name;
    
    // 从主文档的 data Map 中获取所有子文档
    // dataMap 存储: blockId -> Y.Doc (但 Y.js 可能会序列化为 GUID 字符串)
    const masterData = document.getMap('data') as any;
    const blockIdToGuidMap = new Map<string, string>(); // blockId -> GUID
    const guidToBlockIdMap = new Map<string, string>(); // GUID -> blockId
    
    // 第一步：收集所有 blockId 和对应的 GUID
    masterData.forEach((value: any, blockId: string) => {
      if (value && typeof value === 'object' && 'guid' in value && typeof value.guid === 'string') {
        // 已经是 Y.Doc 对象
        const guid = value.guid;
        blockIdToGuidMap.set(blockId, guid);
        guidToBlockIdMap.set(guid, blockId);
      } else if (typeof value === 'string' && value.length > 0) {
        // Y.js 将 Y.Doc 序列化为了 GUID 字符串，需要修复
        const guid = value;
        blockIdToGuidMap.set(blockId, guid);
        guidToBlockIdMap.set(guid, blockId);
      }
    });

    if (blockIdToGuidMap.size === 0) {
      console.log(`📄 没有子文档需要加载: ${documentName}`);
      return;
    }

    console.log(`📄 发现 ${blockIdToGuidMap.size} 个子文档需要加载: ${documentName}`);

    // 第二步：为每个 GUID 创建或获取 Y.Doc 对象
    const loadPromises: Promise<void>[] = [];
    const loadedGuids = new Set<string>();

    // 遍历所有需要加载的 GUID
    for (const [blockId, guid] of blockIdToGuidMap.entries()) {
      // 检查 subdocs 中是否已存在该 GUID 的文档
      let childDoc: Doc | null = null;
      document.subdocs.forEach((doc) => {
        if (doc.guid === guid) {
          childDoc = doc;
        }
      });

      // 如果不存在，创建新的 Y.Doc 对象并设置 GUID
      if (!childDoc) {
        childDoc = new Doc({ guid });
        document.subdocs.add(childDoc);
        console.log(`🆕 创建子文档对象: ${documentName}/${blockId}, GUID: ${guid}`);
      }

      // 加载子文档数据
      const childPath = this.getChildDocPath(documentName, guid);
      const loadPromise = fs
        .readFile(childPath)
        .then((childUpdate) => {
          if (childUpdate.length > 0) {
            applyUpdate(childDoc!, childUpdate);
            console.log(`📄 已加载子文档: ${documentName}/${blockId} (GUID: ${guid}, ${childUpdate.length} bytes)`);
          }
          loadedGuids.add(guid);
        })
        .catch((error) => {
          // 子文档文件不存在时，只记录警告，不抛出错误
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn(`⚠️ 子文档文件不存在: ${documentName}/${blockId} (GUID: ${guid})，将创建新文档`);
          } else {
            console.error(`❌ 加载子文档失败: ${documentName}/${blockId} (GUID: ${guid})`, error);
          }
          loadedGuids.add(guid); // 即使加载失败，也标记为已处理
        });

      loadPromises.push(loadPromise);
    }

    await Promise.all(loadPromises);

    // 第三步：修复 dataMap，将 GUID 字符串替换为实际的 Y.Doc 对象
    document.transact(() => {
      masterData.forEach((value: any, blockId: string) => {
        if (typeof value === 'string' && value.length > 0) {
          // 值是 GUID 字符串，需要替换为 Y.Doc 对象
          const guid = value;
          // 在 subdocs 中查找对应的 Y.Doc
          document.subdocs.forEach((doc) => {
            if (doc.guid === guid) {
              // 替换 dataMap 中的值
              masterData.set(blockId, doc);
              console.log(`🔧 修复 dataMap: ${blockId} -> Y.Doc (GUID: ${guid})`);
            }
          });
        }
      });
    }, 'DocumentStorage.loadChildDocuments');

    if (loadedGuids.size > 0) {
      console.log(`✅ 子文档加载完成: ${documentName} (${loadedGuids.size}/${blockIdToGuidMap.size} 个)`);
    }
  }

  /**
   * 初始化模板数据到文档
   */
  initializeTemplateData(targetDoc: Document): void {

    // 初始化 maps
    const indexMap = targetDoc.getMap('index');
    const dataMap = targetDoc.getMap('data');

    // 创建第一个子文档
    const blockId1 = '68db402d-b9ff-4449-be1e-2f50aef4054d';
    const childYdoc1 = new Doc({ guid: blockId1 });
    const fragment1 = childYdoc1.getXmlFragment('default');
    
    const paragraph1 = {
      type: 'paragraph',
      attrs: { uuid: blockId1 },
      content: [{ type: 'text', text: '初始文档' }]
    };
    const xmlElement1 = new Y.XmlElement('paragraph');
    this._prosemirrorNodeToYXmlElement(paragraph1, xmlElement1);
    fragment1.insert(0, [xmlElement1]);
    
    childYdoc1.load();

    // 创建第二个子文档
    const blockId2 = '3a64e9ea-004f-431a-bc8c-44ed8115eea7';
    const childYdoc2 = new Doc({ guid: blockId2 });
    const fragment2 = childYdoc2.getXmlFragment('default');
    
    const paragraph2 = {
      type: 'paragraph',
      attrs: { uuid: blockId2 }
    };
    const xmlElement2 = new Y.XmlElement('paragraph');
    this._prosemirrorNodeToYXmlElement(paragraph2, xmlElement2);
    fragment2.insert(0, [xmlElement2]);
    
    childYdoc2.load();

    // 将子文档添加到主文档的 subdocs
    targetDoc.subdocs.add(childYdoc1);
    targetDoc.subdocs.add(childYdoc2);

    // 在主文档中设置映射
    targetDoc.transact(() => {
      // indexMap: blockId -> index
      indexMap.set(blockId1, 0);
      indexMap.set(blockId2, 1);
      
      // dataMap: blockId -> Y.Doc
      dataMap.set(blockId1, childYdoc1);
      dataMap.set(blockId2, childYdoc2);
    }, 'DocumentStorage.initializeTemplateData');

    console.log(`📝 已初始化模板数据到文档: ${targetDoc.name}`);
  }

  /**
   * 将 ProseMirror JSON 节点转换为 YXmlElement
   */
  private _prosemirrorNodeToYXmlElement(node: any, xmlElement: any): void {
    // 设置属性
    if (node.attrs) {
      for (const key in node.attrs) {
        if (node.attrs[key] !== null && node.attrs[key] !== undefined) {
          xmlElement.setAttribute(key, String(node.attrs[key]));
        }
      }
    }

    // 处理子节点
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        if (child.type === 'text') {
          // 文本节点
          const text = new Y.XmlText();
          if (child.text) {
            text.insert(0, child.text);
          }
          // 处理 marks
          if (child.marks && Array.isArray(child.marks)) {
            child.marks.forEach((mark: any) => {
              const markAttrs = mark.attrs || {};
              text.format(0, text.length, { [mark.type]: markAttrs });
            });
          }
          xmlElement.insert(xmlElement.length, [text]);
        } else {
          // 元素节点
          const childElement = new Y.XmlElement(child.type);
          this._prosemirrorNodeToYXmlElement(child, childElement);
          xmlElement.insert(xmlElement.length, [childElement]);
        }
      });
    }
  }

  /**
   * 从存储加载主文档和所有子文档
   */
  async loadDocument(documentName: string, targetDoc: Document): Promise<boolean> {
    try {
      const masterLoaded = await this.loadMasterDocument(documentName, targetDoc);
      
      // 只有在主文档加载成功后才加载子文档
      if (masterLoaded) {
        await this.loadChildDocuments(targetDoc);
        console.log(`✅ 文档加载完成: ${documentName}`);
      }
      
      return masterLoaded;
    } catch (error) {
      console.error(`❌ 文档加载失败: ${documentName}`, error);
      throw error;
    }
  }

  /**
   * 删除文档及其所有子文档
   */
  async deleteDocument(documentName: string): Promise<void> {
    try {
      const masterPath = this.getMasterDocPath(documentName);
      
      // 删除主文档
      try {
        await fs.unlink(masterPath);
        console.log(`🗑️ 已删除主文档: ${documentName}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // 查找并删除所有子文档
      const files = await fs.readdir(this.storageDir);
      const prefix = documentName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const childDocPattern = new RegExp(`^${prefix}_child_.+\\.ydoc$`);

      const deletePromises = files
        .filter((file) => childDocPattern.test(file))
        .map((file) => {
          const filePath = path.join(this.storageDir, file);
          return fs
            .unlink(filePath)
            .then(() => {
              console.log(`🗑️ 已删除子文档: ${file}`);
            })
            .catch((error) => {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error(`❌ 删除子文档失败: ${file}`, error);
              }
            });
        });

      await Promise.all(deletePromises);
      console.log(`✅ 文档删除完成: ${documentName}`);
    } catch (error) {
      console.error(`❌ 删除文档失败: ${documentName}`, error);
      throw error;
    }
  }
}

export default DocumentStorage;

