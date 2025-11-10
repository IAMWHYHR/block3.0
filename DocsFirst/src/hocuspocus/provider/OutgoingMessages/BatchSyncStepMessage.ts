import * as encoding from "lib0/encoding"
import type { OutgoingMessageArguments } from "../types.js"
import { MessageType } from "../types.js"
import { OutgoingMessage } from "../OutgoingMessage.js"

export interface BatchSyncStepMessageArguments {
	documentName: string
	subdocIds: string[]
	updates?: Map<string, Uint8Array>
}

export class BatchSyncStepMessage extends OutgoingMessage {
	type = MessageType.BatchSyncStep

	description = "Batch sync step for subdocuments"

	get(args: Partial<BatchSyncStepMessageArguments>) {
		if (typeof args.documentName === "undefined") {
			throw new Error(
				"The batch sync step message requires documentName as an argument",
			)
		}

		if (typeof args.subdocIds === "undefined") {
			throw new Error(
				"The batch sync step message requires subdocIds as an argument",
			)
		}

		encoding.writeVarString(this.encoder, args.documentName)
		encoding.writeVarUint(this.encoder, this.type)
		
		// Write number of subdocs
		encoding.writeVarUint(this.encoder, args.subdocIds.length)
		
		// Write each subdoc ID
		args.subdocIds.forEach((id) => {
			encoding.writeVarString(this.encoder, id)
		})

		// Write updates if provided
		if (args.updates && args.updates.size > 0) {
			encoding.writeVarUint(this.encoder, args.updates.size)
			args.updates.forEach((update, id) => {
				encoding.writeVarString(this.encoder, id)
				encoding.writeVarUint8Array(this.encoder, update)
			})
		} else {
			encoding.writeVarUint(this.encoder, 0)
		}

		return this.encoder
	}
}

