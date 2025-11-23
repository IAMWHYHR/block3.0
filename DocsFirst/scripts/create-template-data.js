import * as Y from 'yjs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * 将 ProseMirror JSON 节点转换为 YXmlElement
 */
function prosemirrorNodeToYXmlElement(node, xmlElement) {
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
    node.content.forEach((child) => {
      if (child.type === 'text') {
        // 文本节点
        const text = new Y.XmlText();
        if (child.text) {
          text.insert(0, child.text);
        }
        // 处理 marks
        if (child.marks && Array.isArray(child.marks)) {
          child.marks.forEach((mark) => {
            const markAttrs = mark.attrs || {};
            text.format(0, text.length, { [mark.type]: markAttrs });
          });
        }
        xmlElement.insert(xmlElement.length, [text]);
      } else {
        // 元素节点
        const childElement = new Y.XmlElement(child.type);
        prosemirrorNodeToYXmlElement(child, childElement);
        xmlElement.insert(xmlElement.length, [childElement]);
      }
    });
  }
}

/**
 * 创建模板数据
 */
async function createTemplateData() {
  const storageDir = './storage/documents';
  
  // 确保目录存在
  await fs.mkdir(storageDir, { recursive: true });

  // 编辑器数据
  const editorData = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { uuid: '68db402d-b9ff-4449-be1e-2f50aef4054d' },
        content: [{ type: 'text', text: '初始文档' }]
      },
      {
        type: 'paragraph',
        attrs: { uuid: '3a64e9ea-004f-431a-bc8c-44ed8115eea7' }
      }
    ]
  };

  // 创建主文档
  const masterYdoc = new Y.Doc();
  const indexMap = masterYdoc.getMap('index');
  const dataMap = masterYdoc.getMap('data');

  // 创建第一个子文档
  const blockId1 = '68db402d-b9ff-4449-be1e-2f50aef4054d';
  const childYdoc1 = new Y.Doc({ guid: blockId1 });
  const fragment1 = childYdoc1.getXmlFragment('default');
  
  const paragraph1 = {
    type: 'paragraph',
    attrs: { uuid: blockId1 },
    content: [{ type: 'text', text: '初始文档' }]
  };
  const xmlElement1 = new Y.XmlElement('paragraph');
  prosemirrorNodeToYXmlElement(paragraph1, xmlElement1);
  fragment1.insert(0, [xmlElement1]);
  
  childYdoc1.load();

  // 创建第二个子文档
  const blockId2 = '3a64e9ea-004f-431a-bc8c-44ed8115eea7';
  const childYdoc2 = new Y.Doc({ guid: blockId2 });
  const fragment2 = childYdoc2.getXmlFragment('default');
  
  const paragraph2 = {
    type: 'paragraph',
    attrs: { uuid: blockId2 }
  };
  const xmlElement2 = new Y.XmlElement('paragraph');
  prosemirrorNodeToYXmlElement(paragraph2, xmlElement2);
  fragment2.insert(0, [xmlElement2]);
  
  childYdoc2.load();

  // 将子文档添加到主文档的 subdocs
  masterYdoc.subdocs.add(childYdoc1);
  masterYdoc.subdocs.add(childYdoc2);

  // 在主文档中设置映射（先初始化 maps）
  masterYdoc.getMap('index');
  masterYdoc.getMap('data');
  
  masterYdoc.transact(() => {
    // indexMap: blockId -> index
    indexMap.set(blockId1, 0);
    indexMap.set(blockId2, 1);
    // dataMap: blockId -> Y.Doc
    dataMap.set(blockId1, childYdoc1);
    dataMap.set(blockId2, childYdoc2);
  }, 'createTemplateData');

  // 保存主文档
  const masterUpdate = Y.encodeStateAsUpdate(masterYdoc);
  const masterPath = path.join(storageDir, 'docsfirst-demo-room.ydoc');
  await fs.writeFile(masterPath, masterUpdate);
  console.log(`✅ 已创建主文档: ${masterPath}`);

  // 保存子文档
  const childUpdate1 = Y.encodeStateAsUpdate(childYdoc1);
  const childPath1 = path.join(storageDir, `docsfirst-demo-room_child_${blockId1}.ydoc`);
  await fs.writeFile(childPath1, childUpdate1);
  console.log(`✅ 已创建子文档1: ${childPath1}`);

  const childUpdate2 = Y.encodeStateAsUpdate(childYdoc2);
  const childPath2 = path.join(storageDir, `docsfirst-demo-room_child_${blockId2}.ydoc`);
  await fs.writeFile(childPath2, childUpdate2);
  console.log(`✅ 已创建子文档2: ${childPath2}`);

  console.log('\n📦 模板数据创建完成！');
  console.log(`主文档: docsfirst-demo-room.ydoc`);
  console.log(`子文档1: docsfirst-demo-room_child_${blockId1}.ydoc`);
  console.log(`子文档2: docsfirst-demo-room_child_${blockId2}.ydoc`);
}

// 执行
createTemplateData().catch(console.error);

