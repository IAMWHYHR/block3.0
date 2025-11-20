import * as encoding from "lib0/encoding"
import * as syncProtocol from "../../../y-protocol/sync.js"
import { MessageType } from "../types.js"
import { OutgoingMessage } from "../OutgoingMessage.js"

export interface BatchUpdateMessageArguments {
	documentName: string
	updatedDocuments: Array<{ documentName: string; update: Uint8Array }>
}

export class BatchUpdateMessage extends OutgoingMessage {
	type = MessageType.Sync
	description = "Batch update for subdocuments"

	get(args: Partial<BatchUpdateMessageArguments>) {
		if (typeof args.documentName === "undefined") {
			throw new Error(
				"The batch update message requires documentName as an argument",
			)
		}

		if (typeof args.updatedDocuments === "undefined" || !Array.isArray(args.updatedDocuments)) {
			throw new Error(
				"The batch update message requires updatedDocuments array as an argument",
			)
		}

		// Write documentName (主文档ID)
		encoding.writeVarString(this.encoder, args.documentName)
		// Write hMessageType (Hocuspocus消息类型，固定填0：Sync)
		encoding.writeVarUint(this.encoder, this.type)
		// Write yMessageType (yjs消息类型，固定填9：batchUpdate)
		encoding.writeVarUint(this.encoder, syncProtocol.messageYjsBatchUpdate)
		// Write batch update data
		syncProtocol.writeBatchUpdate(this.encoder, args.updatedDocuments)

		return this.encoder
	}
}

