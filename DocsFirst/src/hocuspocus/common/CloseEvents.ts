export interface CloseEvent {
	code: number
	reason: string
}

export const MessageTooBig: CloseEvent = {
	code: 1009,
	reason: "Message Too Big",
}

export const ResetConnection: CloseEvent = {
	code: 4205,
	reason: "Reset Connection",
}

export const Unauthorized: CloseEvent = {
	code: 4401,
	reason: "Unauthorized",
}

export const Forbidden: CloseEvent = {
	code: 4403,
	reason: "Forbidden",
}

export const ConnectionTimeout: CloseEvent = {
	code: 4408,
	reason: "Connection Timeout",
}

