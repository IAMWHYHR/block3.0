import { AuthMessageType } from "@hocuspocus/common";
import * as decoding from "lib0/decoding";
import { readVarString } from "lib0/decoding";
import { applyAwarenessUpdate } from "y-protocols/awareness";
import {
	messageYjsSyncStep1,
	messageYjsSyncStep2,
	messageYjsUpdate,
	messageYjsBatchUpdate,
	messageYjsBatchSyncStep1,
	messageYjsBatchSyncStep2,
	readSyncStep1,
	readSyncStep2,
	readUpdate,
	readBatchUpdate,
	readBatchSyncStep1,
	readBatchSyncStep2,
} from "y-protocols/sync";
import * as Y from "yjs";
import type Connection from "./Connection.ts";
import type Document from "./Document.ts";
import type { IncomingMessage } from "./IncomingMessage.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import { MessageType } from "./types.ts";
import { DocumentStorage } from "./DocumentStorage.ts";

export class MessageReceiver {
	message: IncomingMessage;

	defaultTransactionOrigin?: string;

	private static documentStorage: DocumentStorage | null = null;

	constructor(message: IncomingMessage, defaultTransactionOrigin?: string) {
		this.message = message;
		this.defaultTransactionOrigin = defaultTransactionOrigin;
	}

	/**
	 * 设置文档存储实例（应在服务器启动时调用）
	 */
	static setDocumentStorage(storage: DocumentStorage): void {
		MessageReceiver.documentStorage = storage;
	}

	/**
	 * 从数据存储中获取或创建子文档映射
	 * documentName 在这里是子文档的标识符（通常是 blockId）
	 */
	private async getOrCreateSubDocMap(
		document: Document,
	): Promise<Map<string, Y.Doc>> {
		const subDocMap = new Map<string, Y.Doc>();
		const masterData = document.getMap("data") as Y.Map<string>;
		
		// 从 data Map 中获取所有子文档的映射关系 (blockId -> GUID)
		masterData.forEach((childGuid: string, blockId: string) => {
			if (typeof childGuid === "string" && childGuid.length > 0) {
				// 在 subdocs 中查找对应的子文档
				document.subdocs.forEach((childDoc) => {
					if (childDoc.guid === childGuid) {
						subDocMap.set(blockId, childDoc);
					}
				});
				
				// 如果找不到，说明子文档还没有被创建
				// 这种情况会在需要时通过 getOrCreateChildDoc 处理
			}
		});

		return subDocMap;
	}

	/**
	 * 获取或创建子文档
	 * 如果子文档不存在，创建新的子文档并添加到数据存储
	 */
	private async getOrCreateChildDoc(
		document: Document,
		documentName: string,
	): Promise<Y.Doc> {
		// 先从现有的 subDocMap 中查找
		const subDocMap = await this.getOrCreateSubDocMap(document);
		let childDoc = subDocMap.get(documentName);

		if (!childDoc) {
			// 子文档不存在，创建新的子文档
			childDoc = new Y.Doc();
			
			// 将子文档添加到主文档的 subdocs 集合
			document.subdocs.add(childDoc);
			
			// 将子文档的 GUID 存储到主文档的 data Map
			const masterData = document.getMap("data") as Y.Map<string>;
			masterData.set(documentName, childDoc.guid);
			
			console.log(`🆕 创建新子文档: ${document.name}/${documentName}, GUID: ${childDoc.guid}`);
			
			// 如果 DocumentStorage 可用，存储新创建的子文档
			if (MessageReceiver.documentStorage) {
				try {
					// 创建一个临时 Document 对象来存储子文档
					// 注意：这里我们只存储子文档本身，不存储主文档
					const childUpdate = Y.encodeStateAsUpdate(childDoc);
					const safeName = document.name.replace(/[^a-zA-Z0-9_-]/g, "_");
					const safeGuid = childDoc.guid.replace(/[^a-zA-Z0-9_-]/g, "_");
					
					// 使用 DocumentStorage 的存储路径逻辑
					// @ts-ignore - node:fs/promises 和 node:path 在运行时可用
					const fs = await import("node:fs/promises");
					// @ts-ignore
					const path = await import("node:path");
					const storageDir = "./storage/documents";
					const childPath = path.join(storageDir, `${safeName}_child_${safeGuid}.ydoc`);
					
					await fs.mkdir(storageDir, { recursive: true });
					await fs.writeFile(childPath, childUpdate);
					
					console.log(`💾 已存储新创建的子文档: ${document.name}/${documentName}`);
				} catch (error) {
					console.error(`❌ 存储新子文档失败: ${document.name}/${documentName}`, error);
					// 不抛出错误，允许继续执行
				}
			}
		}

		return childDoc;
	}

	public async apply(
		document: Document,
		connection?: Connection,
		reply?: (message: Uint8Array) => void,
	): Promise<void> {
		const { message } = this;
		const type = message.readVarUint();
		const emptyMessageLength = message.length;

		switch (type) {
			case MessageType.Sync:
			case MessageType.SyncReply: {
				message.writeVarUint(MessageType.Sync);
				await this.readSyncMessage(
					message,
					document,
					connection,
					reply,
					type !== MessageType.SyncReply,
				);

				if (message.length > emptyMessageLength + 1) {
					if (reply) {
						reply(message.toUint8Array());
					} else if (connection) {
						// TODO: We should log this, shouldn't we?
						// this.logger.log({
						//   direction: 'out',
						//   type: MessageType.Awareness,
						//   category: 'Update',
						// })
						connection.send(message.toUint8Array());
					}
				}

				break;
			}
			case MessageType.Awareness: {
				applyAwarenessUpdate(
					document.awareness,
					message.readVarUint8Array(),
					connection?.webSocket,
				);

				break;
			}
			case MessageType.QueryAwareness: {
				this.applyQueryAwarenessMessage(document, reply);

				break;
			}
			case MessageType.Stateless: {
				connection?.callbacks.statelessCallback({
					connection,
					documentName: document.name,
					document,
					payload: readVarString(message.decoder),
				});

				break;
			}
			case MessageType.BroadcastStateless: {
				const msg = message.readVarString();
				document.getConnections().forEach((connection) => {
					connection.sendStateless(msg);
				});
				break;
			}

			case MessageType.CLOSE: {
				connection?.close({
					code: 1000,
					reason: "provider_initiated",
				});
				break;
			}

			case MessageType.Auth: {
				const authType = message.readVarUint();
				if (authType === AuthMessageType.Token) {
					connection?.callbacks.onTokenSyncCallback({
						token: message.readVarString(),
					});
					break;
				}
				console.error(
					"Received an authentication message on a connection that is already fully authenticated. Probably your provider has been destroyed + recreated really fast.",
				);
				break;
			}

			default:
				console.error(
					`Unable to handle message of type ${type}: no handler defined! Are your provider/server versions aligned?`,
				);
			// Do nothing
		}
	}

	async readSyncMessage(
		message: IncomingMessage,
		document: Document,
		connection?: Connection,
		reply?: (message: Uint8Array) => void,
		requestFirstSync = true,
	): Promise<void> {
		const type = message.readVarUint();

		if (connection) {
			connection.callbacks.beforeSync(connection, {
				type,
				payload: message.peekVarUint8Array(),
			});
		}

		switch (type) {
			case messageYjsSyncStep1: {
				readSyncStep1(message.decoder, message.encoder, document);

				// When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1.
				if (reply && requestFirstSync) {
					const syncMessage = new OutgoingMessage(document.name)
						.createSyncReplyMessage()
						.writeFirstSyncStepFor(document);

					reply(syncMessage.toUint8Array());
				} else if (connection) {
					const syncMessage = new OutgoingMessage(document.name)
						.createSyncMessage()
						.writeFirstSyncStepFor(document);

					connection.send(syncMessage.toUint8Array());
				}
				break;
			}
			case messageYjsSyncStep2:
				if (connection?.readOnly) {
					// We're in read-only mode, so we can't apply the update.
					// Let's use snapshotContainsUpdate to see if the update actually contains changes.
					// If not, we can still ack the update
					const snapshot = Y.snapshot(document);
					const update = decoding.readVarUint8Array(message.decoder);
					if (Y.snapshotContainsUpdate(snapshot, update)) {
						// no new changes in update
						const ackMessage = new OutgoingMessage(
							document.name,
						).writeSyncStatus(true);

						connection.send(ackMessage.toUint8Array());
					} else {
						// new changes in update that we can't apply, because readOnly
						const ackMessage = new OutgoingMessage(
							document.name,
						).writeSyncStatus(false);

						connection.send(ackMessage.toUint8Array());
					}
					break;
				}

				readSyncStep2(
					message.decoder,
					document,
					connection ?? this.defaultTransactionOrigin,
				);

				if (connection) {
					connection.send(
						new OutgoingMessage(document.name)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			case messageYjsUpdate:
				if (connection?.readOnly) {
					connection.send(
						new OutgoingMessage(document.name)
							.writeSyncStatus(false)
							.toUint8Array(),
					);
					break;
				}

				readUpdate(message.decoder, document, connection);
				if (connection) {
					connection.send(
						new OutgoingMessage(document.name)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			case messageYjsBatchUpdate: {
				// Handle BatchUpdate from client
				const updatedDocuments = readBatchUpdate(message.decoder);
				
				// Get subdocuments from data storage
				const subDocMap = await this.getOrCreateSubDocMap(document);
				
				// Apply updates to subdocuments
				for (const { documentName, update } of updatedDocuments) {
					let doc = subDocMap.get(documentName);
					
					// 如果子文档不存在，创建新的子文档
					if (!doc) {
						doc = await this.getOrCreateChildDoc(document, documentName);
					}
					
					if (doc) {
						try {
							Y.applyUpdate(doc, update, connection ?? this.defaultTransactionOrigin);
						} catch (error) {
							console.error(`Caught error while handling a batch update for subdoc ${documentName}`, error);
						}
					}
				}

				// Broadcast the batch update to all other clients
				const batchUpdateMessage = new OutgoingMessage(document.name)
					.createBatchUpdateMessage(updatedDocuments);
				
				document.getConnections().forEach((conn) => {
					if (conn !== connection) {
						conn.send(batchUpdateMessage.toUint8Array());
					}
				});

				// Acknowledge the update
				if (connection) {
					connection.send(
						new OutgoingMessage(document.name)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			}
			case messageYjsBatchSyncStep1: {
				// Handle BatchSyncStep1 from client
				const subDocs = readBatchSyncStep1(message.decoder);
				
				// 从数据存储中获取子文档映射，如果不存在则创建
				const subDocMap = await this.getOrCreateSubDocMap(document);
				
				// 为每个请求的子文档获取或创建子文档
				const replySubDocs = await Promise.all(
					subDocs.map(async ({ documentName, sv }: { documentName: string; sv: Uint8Array }) => {
						let doc = subDocMap.get(documentName);
						
						// 如果子文档不存在，创建新的子文档
						if (!doc) {
							doc = await this.getOrCreateChildDoc(document, documentName);
						}
						
						return { documentName, doc, encodedStateVector: sv };
					})
				);

				// Reply with BatchSyncStep2
				if (reply) {
					const batchSyncMessage = new OutgoingMessage(document.name)
						.createBatchSyncStep2Message(replySubDocs);
					reply(batchSyncMessage.toUint8Array());
				} else if (connection) {
					const batchSyncMessage = new OutgoingMessage(document.name)
						.createBatchSyncStep2Message(replySubDocs);
					connection.send(batchSyncMessage.toUint8Array());
				}
				break;
			}
			case messageYjsBatchSyncStep2: {
				// Handle BatchSyncStep2 from client
				const subDocMap = await this.getOrCreateSubDocMap(document);
				readBatchSyncStep2(
					message.decoder,
					subDocMap,
					connection ?? this.defaultTransactionOrigin,
				);

				// Acknowledge the sync
				if (connection) {
					connection.send(
						new OutgoingMessage(document.name)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			}
			default:
				throw new Error(`Received a message with an unknown type: ${type}`);
		}
	}

	applyQueryAwarenessMessage(
		document: Document,
		reply?: (message: Uint8Array) => void,
	) {
		const message = new OutgoingMessage(
			document.name,
		).createAwarenessUpdateMessage(document.awareness);

		if (reply) {
			reply(message.toUint8Array());
		}
	}
}


