import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
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
   * 注意：此方法假设主文档加载后，子文档的引用已经存在于 subdocs 集合中
   * 如果子文档还没有被创建，我们需要等待它们被创建后再加载数据
   */
  async loadChildDocuments(document: Document): Promise<void> {
    const documentName = document.name;
    
    // 从主文档的 data Map 中获取所有子文档的 GUID
    const masterData = document.getMap('data') as any;
    const childGuids: Set<string> = new Set();
    
    // 收集所有子文档的 GUID
    masterData.forEach((value: any, key: string) => {
      if (typeof value === 'string' && value.length > 0) {
        // value 应该是子文档的 GUID
        childGuids.add(value);
      }
    });

    if (childGuids.size === 0) {
      console.log(`📄 没有子文档需要加载: ${documentName}`);
      return;
    }

    console.log(`📄 发现 ${childGuids.size} 个子文档需要加载: ${documentName}`);

    // 加载每个子文档
    // 首先尝试从 subdocs 中查找已存在的子文档
    const loadPromises: Promise<void>[] = [];
    const loadedGuids = new Set<string>();

    // 遍历 subdocs，为每个子文档加载数据
    document.subdocs.forEach((childDoc) => {
      const childGuid = childDoc.guid;
      if (childGuids.has(childGuid)) {
        loadedGuids.add(childGuid);
        const childPath = this.getChildDocPath(documentName, childGuid);
        
        const loadPromise = fs
          .readFile(childPath)
          .then((childUpdate) => {
            if (childUpdate.length > 0) {
              applyUpdate(childDoc, childUpdate);
              console.log(`📄 已加载子文档: ${documentName}/${childGuid} (${childUpdate.length} bytes)`);
            }
          })
          .catch((error) => {
            // 子文档文件不存在时，只记录警告，不抛出错误
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              console.warn(`⚠️ 子文档文件不存在: ${documentName}/${childGuid}，将创建新文档`);
            } else {
              console.error(`❌ 加载子文档失败: ${documentName}/${childGuid}`, error);
            }
          });

        loadPromises.push(loadPromise);
      }
    });

    // 对于在 data Map 中但不在 subdocs 中的 GUID，记录警告
    childGuids.forEach((guid) => {
      if (!loadedGuids.has(guid)) {
        console.warn(`⚠️ 子文档 GUID ${guid} 在 data Map 中但不在 subdocs 中，可能稍后会被创建`);
      }
    });

    await Promise.all(loadPromises);
    
    if (loadedGuids.size > 0) {
      console.log(`✅ 子文档加载完成: ${documentName} (${loadedGuids.size}/${childGuids.size} 个)`);
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

