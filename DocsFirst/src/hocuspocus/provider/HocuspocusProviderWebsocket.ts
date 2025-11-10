import { WsReadyStates } from "../common/index.js"
import { retry } from "@lifeomic/attempt"
import * as time from "lib0/time"
import EventEmitter from "./EventEmitter.js"
import type { HocuspocusProvider } from "./HocuspocusProvider.js"
import { IncomingMessage } from "./IncomingMessage.js"
import { CloseMessage } from "./OutgoingMessages/CloseMessage.js"
import {
	WebSocketStatus,
	type onAwarenessChangeParameters,
	type onAwarenessUpdateParameters,
	type onCloseParameters,
	type onDisconnectParameters,
	type onMessageParameters,
	type onOpenParameters,
	type onOutgoingMessageParameters,
	type onStatusParameters,
} from "./types.js"

export type HocuspocusWebSocket = WebSocket & { identifier: string }
export type HocusPocusWebSocket = HocuspocusWebSocket

export type HocuspocusProviderWebsocketConfiguration = Required<
	Pick<CompleteHocuspocusProviderWebsocketConfiguration, "url">
> &
	Partial<CompleteHocuspocusProviderWebsocketConfiguration>

export interface CompleteHocuspocusProviderWebsocketConfiguration {
	autoConnect: boolean
	url: string
	WebSocketPolyfill: any
	messageReconnectTimeout: number
	delay: number
	initialDelay: number
	factor: number
	maxAttempts: number
	minDelay: number
	maxDelay: number
	jitter: boolean
	timeout: number
	handleTimeout: (() => Promise<unknown>) | null
	onOpen: (data: onOpenParameters) => void
	onConnect: () => void
	onMessage: (data: onMessageParameters) => void
	onOutgoingMessage: (data: onOutgoingMessageParameters) => void
	onStatus: (data: onStatusParameters) => void
	onDisconnect: (data: onDisconnectParameters) => void
	onClose: (data: onCloseParameters) => void
	onDestroy: () => void
	onAwarenessUpdate: (data: onAwarenessUpdateParameters) => void
	onAwarenessChange: (data: onAwarenessChangeParameters) => void
	providerMap: Map<string, HocuspocusProvider>
}

export class HocuspocusProviderWebsocket extends EventEmitter {
	private messageQueue: any[] = []

	public configuration: CompleteHocuspocusProviderWebsocketConfiguration = {
		url: "",
		autoConnect: true,
		// @ts-ignore
		document: undefined,
		WebSocketPolyfill: undefined,
		messageReconnectTimeout: 30000,
		delay: 1000,
		initialDelay: 0,
		factor: 2,
		maxAttempts: 0,
		minDelay: 1000,
		maxDelay: 30000,
		jitter: true,
		timeout: 0,
		onOpen: () => null,
		onConnect: () => null,
		onMessage: () => null,
		onOutgoingMessage: () => null,
		onStatus: () => null,
		onDisconnect: () => null,
		onClose: () => null,
		onDestroy: () => null,
		onAwarenessUpdate: () => null,
		onAwarenessChange: () => null,
		handleTimeout: null,
		providerMap: new Map(),
	}

	webSocket: HocusPocusWebSocket | null = null
	webSocketHandlers: { [key: string]: any } = {}
	shouldConnect = true
	status = WebSocketStatus.Disconnected
	lastMessageReceived = 0
	identifier = 0
	intervals: any = {
		connectionChecker: null,
	}
	connectionAttempt: {
		resolve: (value?: any) => void
		reject: (reason?: any) => void
	} | null = null

	constructor(configuration: HocuspocusProviderWebsocketConfiguration) {
		super()
		this.setConfiguration(configuration)

		this.configuration.WebSocketPolyfill = configuration.WebSocketPolyfill
			? configuration.WebSocketPolyfill
			: WebSocket

		this.on("open", this.configuration.onOpen)
		this.on("open", this.onOpen.bind(this))
		this.on("connect", this.configuration.onConnect)
		this.on("message", this.configuration.onMessage)
		this.on("outgoingMessage", this.configuration.onOutgoingMessage)
		this.on("status", this.configuration.onStatus)
		this.on("disconnect", this.configuration.onDisconnect)
		this.on("close", this.configuration.onClose)
		this.on("destroy", this.configuration.onDestroy)
		this.on("awarenessUpdate", this.configuration.onAwarenessUpdate)
		this.on("awarenessChange", this.configuration.onAwarenessChange)

		this.on("close", this.onClose.bind(this))
		this.on("message", this.onMessage.bind(this))

		this.intervals.connectionChecker = setInterval(
			this.checkConnection.bind(this),
			this.configuration.messageReconnectTimeout / 10,
		)

		if (this.shouldConnect) {
			this.connect()
		}
	}

	receivedOnOpenPayload?: Event | undefined = undefined

	async onOpen(event: Event) {
		this.status = WebSocketStatus.Connected
		this.emit("status", { status: WebSocketStatus.Connected })

		this.cancelWebsocketRetry = undefined
		this.receivedOnOpenPayload = event
	}

	attach(provider: HocuspocusProvider) {
		this.configuration.providerMap.set(provider.configuration.name, provider)

		if (this.status === WebSocketStatus.Disconnected && this.shouldConnect) {
			this.connect()
		}

		if (
			this.receivedOnOpenPayload &&
			this.status === WebSocketStatus.Connected
		) {
			provider.onOpen(this.receivedOnOpenPayload)
		}
	}

	detach(provider: HocuspocusProvider) {
		if (this.configuration.providerMap.has(provider.configuration.name)) {
			provider.send(CloseMessage, {
				documentName: provider.configuration.name,
			})
			this.configuration.providerMap.delete(provider.configuration.name)
		}
	}

	public setConfiguration(
		configuration: Partial<HocuspocusProviderWebsocketConfiguration> = {},
	): void {
		this.configuration = { ...this.configuration, ...configuration }

		if (!this.configuration.autoConnect) {
			this.shouldConnect = false
		}
	}

	cancelWebsocketRetry?: () => void

	async connect() {
		if (this.status === WebSocketStatus.Connected) {
			return
		}

		if (this.cancelWebsocketRetry) {
			this.cancelWebsocketRetry()
			this.cancelWebsocketRetry = undefined
		}

		this.receivedOnOpenPayload = undefined
		this.shouldConnect = true

		const abortableRetry = () => {
			let cancelAttempt = false

			const retryPromise = retry(this.createWebSocketConnection.bind(this), {
				delay: this.configuration.delay,
				initialDelay: this.configuration.initialDelay,
				factor: this.configuration.factor,
				maxAttempts: this.configuration.maxAttempts,
				minDelay: this.configuration.minDelay,
				maxDelay: this.configuration.maxDelay,
				jitter: this.configuration.jitter,
				timeout: this.configuration.timeout,
				handleTimeout: this.configuration.handleTimeout,
				beforeAttempt: (context) => {
					if (!this.shouldConnect || cancelAttempt) {
						context.abort()
					}
				},
			}).catch((error: any) => {
				if (error && error.code !== "ATTEMPT_ABORTED") {
					throw error
				}
			})

			return {
				retryPromise,
				cancelFunc: () => {
					cancelAttempt = true
				},
			}
		}

		const { retryPromise, cancelFunc } = abortableRetry()
		this.cancelWebsocketRetry = cancelFunc

		return retryPromise
	}

	attachWebSocketListeners(ws: HocusPocusWebSocket, reject: Function) {
		const { identifier } = ws
		const onMessageHandler = (payload: any) => this.emit("message", payload)
		const onCloseHandler = (payload: any) =>
			this.emit("close", { event: payload })
		const onOpenHandler = (payload: any) => this.emit("open", payload)
		const onErrorHandler = (err: any) => {
			reject(err)
		}

		this.webSocketHandlers[identifier] = {
			message: onMessageHandler,
			close: onCloseHandler,
			open: onOpenHandler,
			error: onErrorHandler,
		}

		const handlers = this.webSocketHandlers[ws.identifier]

		Object.keys(handlers).forEach((name) => {
			ws.addEventListener(name, handlers[name])
		})
	}

	cleanupWebSocket() {
		if (!this.webSocket) {
			return
		}
		const { identifier } = this.webSocket
		const handlers = this.webSocketHandlers[identifier]

		Object.keys(handlers).forEach((name) => {
			this.webSocket?.removeEventListener(name, handlers[name])
			delete this.webSocketHandlers[identifier]
		})
		this.webSocket.close()
		this.webSocket = null
	}

	createWebSocketConnection() {
		return new Promise((resolve, reject) => {
			if (this.webSocket) {
				this.messageQueue = []
				this.cleanupWebSocket()
			}
			this.lastMessageReceived = 0
			this.identifier += 1

			const ws = new this.configuration.WebSocketPolyfill(this.url)
			ws.binaryType = "arraybuffer"
			ws.identifier = this.identifier

			this.attachWebSocketListeners(ws, reject)

			this.webSocket = ws

			this.status = WebSocketStatus.Connecting
			this.emit("status", { status: WebSocketStatus.Connecting })

			this.connectionAttempt = {
				resolve,
				reject,
			}
		})
	}

	onMessage(event: MessageEvent) {
		this.resolveConnectionAttempt()

		this.lastMessageReceived = time.getUnixTime()

		const message = new IncomingMessage(event.data)
		const documentName = message.peekVarString()

		this.configuration.providerMap.get(documentName)?.onMessage(event)
	}

	resolveConnectionAttempt() {
		if (this.connectionAttempt) {
			this.connectionAttempt.resolve()
			this.connectionAttempt = null

			this.status = WebSocketStatus.Connected
			this.emit("status", { status: WebSocketStatus.Connected })
			this.emit("connect")
			this.messageQueue.forEach((message) => this.send(message))
			this.messageQueue = []
		}
	}

	stopConnectionAttempt() {
		this.connectionAttempt = null
	}

	rejectConnectionAttempt() {
		this.connectionAttempt?.reject()
		this.connectionAttempt = null
	}

	closeTries = 0

	checkConnection() {
		if (this.status !== WebSocketStatus.Connected) {
			return
		}

		if (!this.lastMessageReceived) {
			return
		}

		if (
			this.configuration.messageReconnectTimeout >=
			time.getUnixTime() - this.lastMessageReceived
		) {
			return
		}

		this.closeTries += 1

		if (this.closeTries > 2) {
			this.onClose({
				event: {
					code: 4408,
					reason: "forced",
				},
			})
			this.closeTries = 0
		} else {
			this.webSocket?.close()
			this.messageQueue = []
		}
	}

	get serverUrl() {
		while (this.configuration.url[this.configuration.url.length - 1] === "/") {
			return this.configuration.url.slice(0, this.configuration.url.length - 1)
		}

		return this.configuration.url
	}

	get url() {
		return this.serverUrl
	}

	disconnect() {
		this.shouldConnect = false

		if (this.webSocket === null) {
			return
		}

		try {
			this.webSocket.close()
			this.messageQueue = []
		} catch (e) {
			console.error(e)
		}
	}

	send(message: any) {
		if (this.webSocket?.readyState === WsReadyStates.Open) {
			this.webSocket.send(message)
		} else {
			this.messageQueue.push(message)
		}
	}

	onClose({ event }: onCloseParameters) {
		this.closeTries = 0
		this.cleanupWebSocket()

		if (this.connectionAttempt) {
			this.rejectConnectionAttempt()
		}

		this.status = WebSocketStatus.Disconnected
		this.emit("status", { status: WebSocketStatus.Disconnected })
		this.emit("disconnect", { event })

		if (!this.cancelWebsocketRetry && this.shouldConnect) {
			setTimeout(() => {
				this.connect()
			}, this.configuration.delay)
		}
	}

	destroy() {
		this.emit("destroy")

		clearInterval(this.intervals.connectionChecker)

		this.stopConnectionAttempt()

		this.disconnect()

		this.removeAllListeners()

		this.cleanupWebSocket()
	}
}

