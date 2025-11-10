import { readAuthMessage } from "../common/index.js"
import { readVarInt, readVarString, readVarUint8Array } from "lib0/decoding"
import * as awarenessProtocol from "y-protocols/awareness"
import { messageYjsSyncStep2, readSyncMessage } from "y-protocols/sync"
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

