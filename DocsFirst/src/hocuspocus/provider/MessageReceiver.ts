import { readAuthMessage } from "../common/index.js"
import { readVarInt, readVarString, readVarUint8Array } from "lib0/decoding"
import * as encoding from "lib0/encoding"
import * as awarenessProtocol from "y-protocols/awareness"
import { 
	messageYjsSyncStep2, 
	messageYjsBatchUpdate,
	messageYjsBatchSyncStep1,
	messageYjsBatchSyncStep2,
	readSyncMessage,
	readBatchSyncStep1,
	readBatchSyncStep2,
	readBatchUpdate,
	writeBatchSyncStep2,
} from "../../y-protocol/sync.js"
import * as Y from "yjs"
import type { CloseEvent } from "../common/index.js"
import type { HocuspocusProvider } from "./HocuspocusProvider.js"
import type { IncomingMessage } from "./IncomingMessage.js"
import { OutgoingMessage } from "./OutgoingMessage.js"
import { MessageType } from "./types.js"

export class MessageReceiver {
	message: IncomingMessage

	constructor(message: IncomingMessage) {
		this.message = message
	}

	public apply(provider: HocuspocusProvider, emitSynced: boolean) {
		const { message } = this
		const type = message.readVarUint()

		const emptyMessageLength = message.length()

		switch (type) {
			case MessageType.Sync:
				this.applySyncMessage(provider, emitSynced)
				break

			case MessageType.Awareness:
				this.applyAwarenessMessage(provider)
				break

			case MessageType.Auth:
				this.applyAuthMessage(provider)
				break

			case MessageType.QueryAwareness:
				this.applyQueryAwarenessMessage(provider)
				break

			case MessageType.Stateless:
				provider.receiveStateless(readVarString(message.decoder))
				break

			case MessageType.SyncStatus:
				this.applySyncStatusMessage(
					provider,
					readVarInt(message.decoder) === 1,
				)
				break

			case MessageType.CLOSE:
				const event: CloseEvent = {
					code: 1000,
					reason: readVarString(message.decoder),
					// @ts-ignore
					target: provider.configuration.websocketProvider.webSocket!,
					type: "close",
				}
				provider.onClose()
				provider.configuration.onClose({ event })
				provider.forwardClose(event)
				break

			case MessageType.BatchSyncStep:
				this.applyBatchSyncStepMessage(provider)
				break

			default:
				throw new Error(`Can’t apply message of unknown type: ${type}`)
		}

		if (message.length() > emptyMessageLength + 1) {
			provider.send(OutgoingMessage, { encoder: message.encoder })
		}
	}

	private applySyncMessage(provider: HocuspocusProvider, emitSynced: boolean) {
		const { message } = this

		// Read yMessageType to check if it's a batch message
		// The message structure is: documentName (already read), hMessageType (already read), yMessageType, ...
		const yMessageType = message.peekVarUint()
		
		if (yMessageType === messageYjsBatchUpdate) {
			// Handle BatchUpdate
			this.applyBatchUpdateMessage(provider)
			return
		} else if (yMessageType === messageYjsBatchSyncStep1) {
			// Handle BatchSyncStep1
			this.applyBatchSyncStep1Message(provider)
			return
		} else if (yMessageType === messageYjsBatchSyncStep2) {
			// Handle BatchSyncStep2
			this.applyBatchSyncStep2Message(provider)
			return
		}

		// Handle regular sync messages
		message.writeVarUint(MessageType.Sync)

		const syncMessageType = readSyncMessage(
			message.decoder,
			message.encoder,
			provider.document,
			provider,
		)

		if (emitSynced && syncMessageType === messageYjsSyncStep2) {
			provider.synced = true
		}
	}

	private applyBatchUpdateMessage(provider: HocuspocusProvider) {
		const { message } = this

		// Read yMessageType (should be 9)
		// Note: peekVarUint was already called in applySyncMessage, so we need to read it now
		const yMessageType = message.readVarUint()
		
		if (yMessageType !== messageYjsBatchUpdate) {
			throw new Error(`Expected batchUpdate message type, got ${yMessageType}`)
		}

		// Read batch update data
		const updatedDocuments = readBatchUpdate(message.decoder)

		// Get subdocuments from provider
		const subDocMap = provider.getSubDocMap?.() || new Map<string, Y.Doc>()
		
		// Apply updates to subdocuments
		// Use SERVER_SYNC_ORIGIN to mark these updates as coming from server
		const SERVER_SYNC_ORIGIN = provider.getServerSyncOrigin()
		updatedDocuments.forEach(({ documentName, update }: { documentName: string; update: Uint8Array }) => {
			// documentName should be blockId (which equals subdoc.guid when client creates subdoc)
			// Try to get doc from subDocMap using documentName as blockId
			let doc = subDocMap.get(documentName)
			
			// If not found by blockId, try to find by GUID in subdocs
			// This handles the case where subDocMap might not have the mapping yet
			if (!doc) {
				console.log(`🔍 Subdoc ${documentName} not found in subDocMap, searching in document.subdocs by GUID`)
				provider.document.subdocs.forEach((childDoc) => {
					if (childDoc.guid === documentName) {
						doc = childDoc
						console.log(`✅ Found subdoc by GUID: ${documentName}`)
					}
				})
			}
			
			if (doc) {
				try {
					// Check if doc is a valid Y.Doc instance
					if (!(doc instanceof Y.Doc)) {
						console.error(`❌ Invalid doc type for ${documentName}, expected Y.Doc, got:`, typeof doc, doc)
						return
					}
					
					// Check if doc is destroyed
					if (doc.isDestroyed) {
						console.error(`❌ Doc ${documentName} is destroyed`)
						return
					}
					
					// Ensure fragment is accessed before applying update
					// This is necessary for observeDeep to work correctly
					// Y.js needs the fragment to be accessed before it can trigger observeDeep events
					// getXmlFragment should never return null - it creates the fragment if it doesn't exist
					const fragment = doc.getXmlFragment('default')
					
					if (!fragment) {
						console.error(`❌ getXmlFragment returned null for ${documentName}`)
						console.error(`   doc type:`, typeof doc)
						console.error(`   doc.constructor.name:`, doc.constructor?.name)
						console.error(`   doc.share:`, doc.share)
						console.error(`   doc.isDestroyed:`, doc.isDestroyed)
						console.error(`   doc.guid:`, doc.guid)
						return
					}
					
					// Access fragment to ensure it's initialized (even if empty)
					const fragmentLength = fragment.length // This triggers fragment initialization if needed
					console.log(`🔍 Fragment accessed for ${documentName}, length: ${fragmentLength}`)
					
					// Now apply the update
					Y.applyUpdate(doc, update, SERVER_SYNC_ORIGIN)
					
					console.log(`✅ Applied batch update to subdoc ${documentName}, fragment length after update: ${fragment.length}`)
				} catch (error) {
					console.error(`Caught error while handling a batch update for subdoc ${documentName}`, error)
				}
			} else {
				console.warn(`⚠️ Subdoc ${documentName} not found in subDocMap or document.subdocs`)
				console.warn(`   Available blockIds in subDocMap:`, Array.from(subDocMap.keys()))
				console.warn(`   Available GUIDs in document.subdocs:`, Array.from(provider.document.subdocs).map(d => d.guid))
			}
		})

		// Handle the updates (provider can implement custom logic)
		if (provider.handleBatchUpdate) {
			provider.handleBatchUpdate(updatedDocuments)
		}
	}

	private applyBatchSyncStep1Message(provider: HocuspocusProvider) {
		const { message } = this

		// The message structure is: documentName, hMessageType, yMessageType, ...
		// documentName and hMessageType are already read in apply() method
		// So we just need to read yMessageType and the batch sync data
		// Note: peekVarUint was already called in applySyncMessage, so we need to read it now
		const yMessageType = message.readVarUint() // Read yMessageType (should be 10)
		
		if (yMessageType !== messageYjsBatchSyncStep1) {
			throw new Error(`Expected batchSyncStep1 message type, got ${yMessageType}`)
		}

		// Read batch sync step 1 data
		const subDocs = readBatchSyncStep1(message.decoder)

		// Prepare reply with BatchSyncStep2
		message.writeVarUint(MessageType.Sync)
		
		// Get subdocuments from provider
		const subDocMap = provider.getSubDocMap?.() || new Map<string, Y.Doc>()
		const dataMap = provider.document.getMap("data")
		
		const replySubDocs = subDocs.map(({ documentName, sv }: { documentName: string; sv: Uint8Array }) => {
			let doc = subDocMap.get(documentName)
			
			// If subdocument doesn't exist, create it
			if (!doc) {
				// Create new childYdoc
				doc = new Y.Doc()
				
				// Add to master document's subdocs collection
				provider.document.subdocs.add(doc)
				
				// Store in data map
				dataMap.set(documentName, doc)
				
				// Load the subdocument if supported
				if (typeof (doc as any).load === 'function') {
					try {
						(doc as any).load()
					} catch (e) {
						// Ignore load errors
					}
				}
			}
			
			// Return with the state vector from the server (sv)
			// If doc is newly created, sv will be empty, which means we need all updates
			return { documentName, doc, encodedStateVector: sv }
		})

		// Write reply message structure: documentName, hMessageType, yMessageType, batchSyncStep2 data
		encoding.writeVarString(message.encoder, provider.configuration.name)
		encoding.writeVarUint(message.encoder, MessageType.Sync)
		encoding.writeVarUint(message.encoder, messageYjsBatchSyncStep2)
		writeBatchSyncStep2(message.encoder, replySubDocs)
	}

	private applyBatchSyncStep2Message(provider: HocuspocusProvider) {
		const { message } = this

		// Read yMessageType (should be 11)
		// Note: peekVarUint was already called in applySyncMessage, so we need to read it now
		const yMessageType = message.readVarUint()
		
		if (yMessageType !== messageYjsBatchSyncStep2) {
			throw new Error(`Expected batchSyncStep2 message type, got ${yMessageType}`)
		}

		// Get subdocuments from provider
		const subDocMap = provider.getSubDocMap?.() || new Map<string, Y.Doc>()
		console.log(`📥 applyBatchSyncStep2Message: subDocMap size: ${subDocMap.size}`)
		console.log(`📥 applyBatchSyncStep2Message: subDocMap keys:`, Array.from(subDocMap.keys()))
		console.log(`📥 applyBatchSyncStep2Message: document.subdocs size: ${provider.document.subdocs.size}`)
		console.log(`📥 applyBatchSyncStep2Message: document.subdocs GUIDs:`, Array.from(provider.document.subdocs).map(d => d.guid))
		
		// Read and apply batch sync step 2 data
		// readBatchSyncStep2 already applies updates to subdocuments
		// Use SERVER_SYNC_ORIGIN to mark these updates as coming from server
		const SERVER_SYNC_ORIGIN = provider.getServerSyncOrigin()
		
		// 修改 readBatchSyncStep2 调用，传入 provider 以便在找不到文档时创建
		const result = readBatchSyncStep2(message.decoder, subDocMap, SERVER_SYNC_ORIGIN, provider)
		console.log(`📥 applyBatchSyncStep2Message: processed ${result.length} subdocs`)
	}

	applySyncStatusMessage(provider: HocuspocusProvider, applied: boolean) {
		if (applied) {
			provider.decrementUnsyncedChanges()
		}
	}

	private applyAwarenessMessage(provider: HocuspocusProvider) {
		if (!provider.awareness) return

		const { message } = this

		awarenessProtocol.applyAwarenessUpdate(
			provider.awareness,
			message.readVarUint8Array(),
			provider,
		)
	}

	private applyAuthMessage(provider: HocuspocusProvider) {
		const { message } = this

		readAuthMessage(
			message.decoder,
			provider.permissionDeniedHandler.bind(provider),
			provider.authenticatedHandler.bind(provider),
		)
	}

	private applyQueryAwarenessMessage(provider: HocuspocusProvider) {
		if (!provider.awareness) return

		const { message } = this

		message.writeVarUint(MessageType.Awareness)
		message.writeVarUint8Array(
			awarenessProtocol.encodeAwarenessUpdate(
				provider.awareness,
				Array.from(provider.awareness.getStates().keys()),
			),
		)
	}

	private applyBatchSyncStepMessage(provider: HocuspocusProvider) {
		const { message } = this

		// Read number of subdocs
		const subdocCount = readVarInt(message.decoder)
		const subdocIds: string[] = []

		// Read each subdoc ID
		for (let i = 0; i < subdocCount; i++) {
			subdocIds.push(readVarString(message.decoder))
		}

		// Read updates if any
		const updateCount = readVarInt(message.decoder)
		const updates = new Map<string, Uint8Array>()

		for (let i = 0; i < updateCount; i++) {
			const id = readVarString(message.decoder)
			const update = readVarUint8Array(message.decoder)
			updates.set(id, update)
		}

		// Handle batch sync step
		if (provider.handleBatchSyncStep) {
			provider.handleBatchSyncStep(subdocIds, updates)
		}
	}
}

