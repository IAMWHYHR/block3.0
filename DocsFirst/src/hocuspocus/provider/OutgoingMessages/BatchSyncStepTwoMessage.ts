import * as encoding from "lib0/encoding"
import * as syncProtocol from "y-protocols/sync"
import type { OutgoingMessageArguments } from "../types.js"
import { MessageType } from "../types.js"
import { OutgoingMessage } from "../OutgoingMessage.js"
import * as Y from "yjs"

export interface BatchSyncStepTwoMessageArguments {
	documentName: string
	subDocs: Array<{ documentName: string; doc: Y.Doc; encodedStateVector: Uint8Array }>
}

export class BatchSyncStepTwoMessage extends OutgoingMessage {
	type = MessageType.Sync
	description = "Batch sync step two for subdocuments"

	get(args: Partial<BatchSyncStepTwoMessageArguments>) {
		if (typeof args.documentName === "undefined") {
			throw new Error(
				"The batch sync step two message requires documentName as an argument",
			)
		}

		if (typeof args.subDocs === "undefined" || !Array.isArray(args.subDocs)) {
			throw new Error(
				"The batch sync step two message requires subDocs array as an argument",
			)
		}

		// Write documentName (主文档ID)
		encoding.writeVarString(this.encoder, args.documentName)
		// Write hMessageType (Hocuspocus消息类型，固定填0：Sync)
		encoding.writeVarUint(this.encoder, this.type)
		// Write yMessageType (yjs消息类型，固定填11：batchSyncStep2)
		encoding.writeVarUint(this.encoder, syncProtocol.messageYjsBatchSyncStep2)
		// Write batch sync step 2 data
		syncProtocol.writeBatchSyncStep2(this.encoder, args.subDocs)

		return this.encoder
	}
}

