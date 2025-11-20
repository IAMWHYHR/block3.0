import * as encoding from "lib0/encoding"
import * as syncProtocol from "../../../y-protocol/sync.js"
import { MessageType } from "../types.js"
import { OutgoingMessage } from "../OutgoingMessage.js"
import * as Y from "yjs"

export interface BatchSyncStepOneMessageArguments {
	documentName: string
	subDocs: Array<{ documentName: string; doc: Y.Doc }>
}

export class BatchSyncStepOneMessage extends OutgoingMessage {
	type = MessageType.Sync
	description = "Batch sync step one for subdocuments"

	get(args: Partial<BatchSyncStepOneMessageArguments>) {
		if (typeof args.documentName === "undefined") {
			throw new Error(
				"The batch sync step one message requires documentName as an argument",
			)
		}

		if (typeof args.subDocs === "undefined" || !Array.isArray(args.subDocs)) {
			throw new Error(
				"The batch sync step one message requires subDocs array as an argument",
			)
		}

		// Write documentName (主文档ID)
		encoding.writeVarString(this.encoder, args.documentName)
		// Write hMessageType (Hocuspocus消息类型，固定填0：Sync)
		encoding.writeVarUint(this.encoder, this.type)
		// Write yMessageType (yjs消息类型，固定填10：batchSyncStep1)
		encoding.writeVarUint(this.encoder, syncProtocol.messageYjsBatchSyncStep1)
		// Write batch sync step 1 data
		syncProtocol.writeBatchSyncStep1(this.encoder, args.subDocs)

		return this.encoder
	}
}


