/**
 * @module sync-protocol
 */

import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as Y from 'yjs'

/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Core Yjs defines two message types:
 * • YjsSyncStep1: Includes the State Set of the sending client. When received, the client should reply with YjsSyncStep2.
 * • YjsSyncStep2: Includes all missing structs and the complete delete set. When received, the client is assured that it
 *   received all information from the remote client.
 *
 * In a peer-to-peer network, you may want to introduce a SyncDone message type. Both parties should initiate the connection
 * with SyncStep1. When a client received SyncStep2, it should reply with SyncDone. When the local client received both
 * SyncStep2 and SyncDone, it is assured that it is synced to the remote client.
 *
 * In a client-server model, you want to handle this differently: The client should initiate the connection with SyncStep1.
 * When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The client replies
 * with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
 * client knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
 * easily be implemented on top of http and websockets. 2. The server should only reply to requests, and not initiate them.
 * Therefore it is necessary that the client initiates the sync.
 *
 * Construction of a message:
 * [messageType : varUint, message definition..]
 *
 * Note: A message does not include information about the room name. This must to be handled by the upper layer protocol!
 *
 * stringify[messageType] stringifies a message definition (messageType is already read from the bufffer)
 */

export const messageYjsSyncStep1 = 0
export const messageYjsSyncStep2 = 1
export const messageYjsUpdate = 2
export const messageYjsBatchUpdate = 9
export const messageYjsBatchSyncStep1 = 10
export const messageYjsBatchSyncStep2 = 11

/**
 * Create a sync step 1 message based on the state of the current shared document.
 *
 * @param {encoding.Encoder} encoder
 * @param {Y.Doc} doc
 */
export const writeSyncStep1 = (encoder, doc) => {
  encoding.writeVarUint(encoder, messageYjsSyncStep1)
  const sv = Y.encodeStateVector(doc)
  encoding.writeVarUint8Array(encoder, sv)
}

/**
 * @param {encoding.Encoder} encoder
 * @param {Y.Doc} doc
 * @param {Uint8Array} [encodedStateVector]
 */
export const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  encoding.writeVarUint(encoder, messageYjsSyncStep2)
  encoding.writeVarUint8Array(encoder, Y.encodeStateAsUpdate(doc, encodedStateVector))
}

/**
 * Read SyncStep1 message and reply with SyncStep2.
 *
 * @param {decoding.Decoder} decoder The reply to the received message
 * @param {encoding.Encoder} encoder The received message
 * @param {Y.Doc} doc
 */
export const readSyncStep1 = (decoder, encoder, doc) =>
  writeSyncStep2(encoder, doc, decoding.readVarUint8Array(decoder))

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 */
export const readSyncStep2 = (decoder, doc, transactionOrigin) => {
  try {
    Y.applyUpdate(doc, decoding.readVarUint8Array(decoder), transactionOrigin)
  } catch (error) {
    // This catches errors that are thrown by event handlers
    console.error('Caught error while handling a Yjs update', error)
  }
}

/**
 * @param {encoding.Encoder} encoder
 * @param {Uint8Array} update
 */
export const writeUpdate = (encoder, update) => {
  encoding.writeVarUint(encoder, messageYjsUpdate)
  encoding.writeVarUint8Array(encoder, update)
}

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 */
export const readUpdate = readSyncStep2

/**
 * Create a batch sync step 1 message for multiple subdocuments.
 * Note: yMessageType should be written before calling this function.
 *
 * @param {encoding.Encoder} encoder
 * @param {Array<{documentName: string, doc: Y.Doc}>} subDocs Array of subdocuments with their names
 */
export const writeBatchSyncStep1 = (encoder, subDocs) => {
  // yMessageType is written by the caller (BatchSyncStepOneMessage)
  encoding.writeVarUint(encoder, subDocs.length)
  
  for (const { documentName, doc } of subDocs) {
    encoding.writeVarString(encoder, documentName)
    const sv = Y.encodeStateVector(doc)
    encoding.writeVarUint8Array(encoder, sv)
  }
}

/**
 * Create a batch sync step 2 message for multiple subdocuments.
 * Note: yMessageType should be written before calling this function.
 *
 * @param {encoding.Encoder} encoder
 * @param {Array<{documentName: string, doc: Y.Doc, encodedStateVector: Uint8Array}>} subDocs Array of subdocuments with their names and state vectors
 */
export const writeBatchSyncStep2 = (encoder, subDocs) => {
  // yMessageType is written by the caller (BatchSyncStepTwoMessage or server OutgoingMessage)
  encoding.writeVarUint(encoder, subDocs.length)
  
  for (const { documentName, doc, encodedStateVector } of subDocs) {
    encoding.writeVarString(encoder, documentName)
    const update = Y.encodeStateAsUpdate(doc, encodedStateVector)
    encoding.writeVarUint8Array(encoder, update)
  }
}

/**
 * Read BatchSyncStep1 message and return subdocuments data.
 *
 * @param {decoding.Decoder} decoder
 * @returns {Array<{documentName: string, sv: Uint8Array}>} Array of subdocuments with their state vectors
 */
export const readBatchSyncStep1 = (decoder) => {
  const subDocCount = decoding.readVarUint(decoder)
  const subDocs = []
  
  for (let i = 0; i < subDocCount; i++) {
    const documentName = decoding.readVarString(decoder)
    const sv = decoding.readVarUint8Array(decoder)
    subDocs.push({ documentName, sv })
  }
  
  return subDocs
}

/**
 * Read and apply BatchSyncStep2 message to subdocuments.
 *
 * @param {decoding.Decoder} decoder
 * @param {Map<string, Y.Doc>} subDocMap Map of document names to Y.Doc instances
 * @param {any} transactionOrigin
 * @returns {Array<{documentName: string, update: Uint8Array}>} Array of subdocuments with their updates
 */
export const readBatchSyncStep2 = (decoder, subDocMap, transactionOrigin, provider = null) => {
  const subDocCount = decoding.readVarUint(decoder)
  const subDocs = []
  
  for (let i = 0; i < subDocCount; i++) {
    const documentName = decoding.readVarString(decoder)
    const update = decoding.readVarUint8Array(decoder)
    
    let doc = subDocMap?.get(documentName)
    
    // 如果 subDocMap 中找不到，尝试从 document.subdocs 中查找
    if (!doc && provider && provider.document) {
      provider.document.subdocs.forEach((childDoc) => {
        if (childDoc.guid === documentName) {
          doc = childDoc
        }
      })
    }
    
    // 如果仍然找不到，尝试从 dataMap 中获取
    if (!doc && provider && provider.document) {
      const dataMap = provider.document.getMap('data')
      const value = dataMap.get(documentName)
      if (value instanceof Y.Doc) {
        doc = value
      } else if (typeof value === 'string') {
        // 如果是 GUID 字符串，从 subdocs 中查找
        provider.document.subdocs.forEach((childDoc) => {
          if (childDoc.guid === value) {
            doc = childDoc
          }
        })
      }
    }
    
    // 如果仍然找不到，创建新的子文档
    // 服务端发送的更新可能包含创建新文档所需的数据
    if (!doc && provider && provider.document) {
      console.log(`🆕 Creating new subdoc ${documentName} from batch sync step2`)
      doc = new Y.Doc({ guid: documentName })
      
      // 将子文档添加到主文档的 subdocs
      provider.document.subdocs.add(doc)
      
      // 将子文档存储到 dataMap
      const dataMap = provider.document.getMap('data')
      dataMap.set(documentName, doc)
      
      console.log(`✅ Created and added subdoc ${documentName} to document.subdocs and dataMap`)
    }
    
    if (doc) {
      try {
        // 确保 fragment 被访问，以便 observeDeep 能正常工作
        const fragment = doc.getXmlFragment('default')
        const fragmentLengthBefore = fragment.length
        
        // 应用更新
        Y.applyUpdate(doc, update, transactionOrigin)
        
        const fragmentLengthAfter = fragment.length
        console.log(`✅ Applied batch sync step2 update to subdoc ${documentName}, fragment length: ${fragmentLengthBefore} -> ${fragmentLengthAfter}`)
      } catch (error) {
        console.error(`Caught error while handling a Yjs update for subdoc ${documentName}`, error)
      }
    } else {
      console.error(`❌ Could not find or create subdoc ${documentName}, update not applied`)
      if (provider && provider.document) {
        console.error(`   Available blockIds in dataMap:`, Array.from(provider.document.getMap('data').keys()))
        console.error(`   Available GUIDs in subdocs:`, Array.from(provider.document.subdocs).map(d => d.guid))
      }
    }
    
    subDocs.push({ documentName, update })
  }
  
  return subDocs
}

/**
 * Create a batch update message for multiple subdocuments.
 * Note: yMessageType should be written before calling this function.
 *
 * @param {encoding.Encoder} encoder
 * @param {Array<{documentName: string, update: Uint8Array}>} updatedDocuments Array of subdocuments with their updates
 */
export const writeBatchUpdate = (encoder, updatedDocuments) => {
  // yMessageType is written by the caller (BatchUpdateMessage or server OutgoingMessage)
  encoding.writeVarUint(encoder, updatedDocuments.length)
  
  for (const { documentName, update } of updatedDocuments) {
    encoding.writeVarString(encoder, documentName)
    encoding.writeVarUint8Array(encoder, update)
  }
}

/**
 * Read BatchUpdate message and return subdocuments data.
 *
 * @param {decoding.Decoder} decoder
 * @returns {Array<{documentName: string, update: Uint8Array}>} Array of subdocuments with their updates
 */
export const readBatchUpdate = (decoder) => {
  const updatedCount = decoding.readVarUint(decoder)
  const updatedDocuments = []
  
  for (let i = 0; i < updatedCount; i++) {
    const documentName = decoding.readVarString(decoder)
    const update = decoding.readVarUint8Array(decoder)
    updatedDocuments.push({ documentName, update })
  }
  
  return updatedDocuments
}

/**
 * @param {decoding.Decoder} decoder A message received from another client
 * @param {encoding.Encoder} encoder The reply message. Does not need to be sent if empty.
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 */
export const readSyncMessage = (decoder, encoder, doc, transactionOrigin) => {
  const messageType = decoding.readVarUint(decoder)
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, doc)
      break
    case messageYjsSyncStep2:
      readSyncStep2(decoder, doc, transactionOrigin)
      break
    case messageYjsUpdate:  
      readUpdate(decoder, doc, transactionOrigin)
      break
    case messageYjsBatchUpdate:
    case messageYjsBatchSyncStep1:
    case messageYjsBatchSyncStep2:
      // Batch messages are handled separately, not through readSyncMessage
      throw new Error('Batch messages should be handled separately')
    default:
      throw new Error('Unknown message type')
  }
  return messageType
}
