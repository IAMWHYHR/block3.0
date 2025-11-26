import * as Y from 'yjs'
// import { DocEvents } from 'yjs/dist/src/internals';
import {getSchema, type JSONContent} from "@tiptap/react";
import {prosemirrorToYXmlFragment, yXmlFragmentToProsemirrorJSON} from "y-prosemirror";
import { Node as PMNode } from 'prosemirror-model'
import { generateKeyBetween } from './fractional-indexing.js'
import {HocuspocusProviderWebsocket} from "../hocuspocus/provider";
export class YDocManager {
  private subdocInstances = new Map<string, Y.Doc>();
  
  private childIndex: Array<{ uuid: string; index: string }> = [];
  private childIndexMap: Map<string, string> = new Map();
  
  private collaborationParams: object = {};
  private socket: HocuspocusProviderWebsocket | null = null;
  
  constructor(public ydoc: Y.Doc) {
    // this.ydoc.on('subdocs', this.onSubdocsChange);
    this.setIndexMap();
    this.ydoc.getMap('index').observeDeep(this.setIndexMap);
    this.ydoc.once('destroy', this.destory);
  }
  
  setCollaborationParamsAndSocket(collaborationParams, socket: HocuspocusProviderWebsocket) {
    this.collaborationParams = collaborationParams;
    this.socket = socket;
  }
  
  // onSubdocsChange: DocEvents['subdocs'] = ({ removed }) => {
  //
  //   removed.forEach((subdoc) => {
  //
  //   });
  // };
  
  setIndexMap = () => {
    const getMap = () => {
      const map = this.ydoc.getMap('index') as Y.Map<string>;
      if (!(map instanceof Y.Map)) {
        return [];
      }
      const uuids = Array.from(map.keys())
        .filter(Boolean)
        .map((uuid) => {
          return {
            uuid,
            index: map.get(uuid) || '',
          };
        })
        .toSorted((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0));
      
      return uuids;
    }
    
    this.childIndex = getMap();
    this.childIndexMap.clear();
    this.childIndex.forEach((v) => {
      this.childIndexMap.set(v.uuid, v.index);
    });
  }
  
  getindeMap = () => {
    return this.childIndexMap;
  }
  
  getIndex() {
    return this.childIndex;
  }
  
  isSubdocExist(uuid: string) {
    return this.childIndexMap.has(uuid);
  }
  
  getSubDoc(uuid: string): Y.Doc | undefined {
    // 已经被删除
    if (!this.isSubdocExist(uuid)) {
      return;
    }
    
    if (this.subdocInstances.has(uuid)) {
      return this.subdocInstances.get(uuid)!;
    }
    
    let subdoc: Y.Doc;
    
    if (this.ydoc.getMap('data').has(uuid)) {
      subdoc = this.ydoc.getMap<Y.Doc>('data').get(uuid)!;
    } else {
      subdoc = new Y.Doc({ guid: uuid });
      this.ydoc.getMap('data').set(uuid, subdoc);
    }
    this.subdocInstances.set(uuid, subdoc);
    return subdoc;
  }
  
  setSubDoc(uuid: string, subdoc: Y.Doc) {
    return this.ydoc.getMap('data').set(uuid, subdoc) as Y.Doc;
  }
  
  getChildBlock(uuid: string): Promise<null | Y.XmlElement> {
    const subdoc = this.getSubDoc(uuid);
    
    return new Promise((resolve) => {
      if (!subdoc) {
        resolve(null);
      }
      
      subdoc?.whenSynced
        ?.then(() => {
          resolve(subdoc?.getXmlFragment('default')?.firstChild as Y.XmlElement | null);
        })
        ?.catch(() => {
          resolve(subdoc?.getXmlFragment('default')?.firstChild as Y.XmlElement | null);
        });
    });
  }
  
  // 软删除，可以通过 undo 回撤
  deleteSubDoc(
    uuid: string,
    trackId?: string,
    meta?: Record<string, string | number | Record<string, string | number>>,
  ) {
    if (this.ydoc.getMap('data').has(uuid)) {
      this.ydoc.transact((tr) => {
        if (meta) Object.keys(meta).forEach((key) => tr.meta.set(key, meta[key]));
        trackId && tr.meta.set('trackId', trackId);
        this.ydoc.getMap('data').delete(uuid);
        this.ydoc.getMap('index').delete(uuid);
      });
    }
  }
  
  async findSubdocIdsByBlockInfo(predicate: (node: Y.XmlElement) => boolean) {
    const subdocIds: string[] = [];
    
    for (const { uuid } of this.getIndex()) {
      const node = await this.getChildBlock(uuid);
      if (node && predicate(node)) {
        subdocIds.push(uuid);
      }
    }
    
    return subdocIds;
  }
  
  transformPMToSubDoc = (ydoc: Y.Doc, pmjson: JSONContent, extensions:[]) => {
    const schema = getSchema(extensions);
    
    const uuids: string[] = [];
    
    (pmjson.content || []).forEach((nodeContent) => {
      if (!nodeContent || !nodeContent.attrs || nodeContent.type === 'text') {
        return;
      }
      
      const guid = `${nodeContent.attrs!.uuid}`;
      uuids.push(guid);
      const subdoc = new Y.Doc({ guid, autoLoad: true, shouldLoad: true });
      const type = subdoc.getXmlFragment('default');
      prosemirrorToYXmlFragment(PMNode.fromJSON(schema, { type: 'doc', content: [nodeContent] }), type);
      getYDocManager(ydoc).setSubDoc(guid, subdoc);
    });
    
    let indexMap = ydoc.getMap('index') as Y.Map<string>;
    
    uuids.reduce<string | null>((prev, uuid) => {
      const index = generateKeyBetween(prev, null);
      indexMap.set(uuid, index);
      return index;
    }, null);
  };
  
  syncWithOldData() {
    if (this.ydoc.getMap('index')?.size) {
      return;
    }
    
    try {
      // 说明是旧版数据，normal 是 xmlfragment
      const oldType = this.ydoc.getXmlFragment('default');
      const data = yXmlFragmentToProsemirrorJSON(oldType);
      
      this.ydoc.transact(() => {
        data && this.transformPMToSubDoc(this.ydoc, data, []);
      });
    } catch (e) {
      //
    }
  }
  
  freeSubDoc(uuid: string) {
    // this.subdocInstances.get(uuid)?.destroy();
    // this.subdocInstances.delete(uuid);
    // this.hocuspocusProviderInstances.get(uuid)?.disconnect();
    // this.hocuspocusProviderInstances.delete(uuid);
  }
  
  destory = () => {
    // this.ydoc.off('subdocs', this.onSubdocsChange);
    this.ydoc.getMap('index').unobserveDeep(this.setIndexMap);
    
    Array.from(this.subdocInstances.values()).forEach((s) => s.destroy());
    
    this.subdocInstances.clear();
    
    // @ts-ignore
    delete this.ydoc.ydocManager;
  };
  
}

const cache: WeakMap<Y.Doc, YDocManager> = new WeakMap();

export const getYDocManager = (ydoc: Y.Doc) => {
  if (cache.has(ydoc)) {
    return cache.get(ydoc)!;
  }
  
  const s = new YDocManager(ydoc);
  // @ts-ignore
  ydoc.ydocManager = s;
  cache.set(ydoc, s);
  return s;
};