import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { CollaborationCursor } from './collaboration/collaboration-cursor'
import { UuidExtension } from './extensions/UuidExtension'
import * as Y from 'yjs'
import { HocuspocusProvider } from './hocuspocus/provider'
import { MasterDocumentBinding } from './collaboration/MasterDocumentBinding'

type CollabEditorProps = {
	roomName: string
	host: string
	userName?: string
}

export default function CollabEditor({ roomName, host, userName = 'Anonymous' }: CollabEditorProps) {
	// Create master document
	const masterYdoc = useMemo(() => {
		const doc = new Y.Doc()
		// Initialize structure
		doc.getMap('index')
		doc.getMap('data')
		return doc
	}, [])

	// Create provider
	const provider = useMemo(() => {
		return new HocuspocusProvider({
			url: host,
			name: roomName,
			document: masterYdoc,
		})
	}, [host, roomName, masterYdoc])

	// State to track when master doc is synced
	const [isSynced, setIsSynced] = useState(false)
	const [connectionStatus, setConnectionStatus] = useState<string>('connecting')

	// Wait for master doc to sync
	useEffect(() => {
		const handleSynced = () => {
			console.log('✅ 文档已同步')
			setIsSynced(true)
			setConnectionStatus('connected')
		}

		const handleStatus = (data: any) => {
			console.log('连接状态变化:', data.status)
			setConnectionStatus(data.status)
			// 如果连接成功，检查同步状态
			if (data.status === 'connected' || data.status === 'Connecting') {
				// 检查 provider 的同步状态
				if (provider.isSynced) {
					setIsSynced(true)
				}
			}
		}

		const handleConnect = () => {
			console.log('✅ 已连接到服务器')
			setConnectionStatus('connected')
			// 连接成功后，检查同步状态
			if (provider.isSynced) {
				setIsSynced(true)
			}
		}

		const handleDisconnect = () => {
			console.log('❌ 与服务器断开连接')
			setConnectionStatus('disconnected')
			setIsSynced(false)
		}

		const handleClose = () => {
			console.log('⚠️  连接已关闭')
			setConnectionStatus('closed')
			setIsSynced(false)
		}

		provider.on('synced', handleSynced)
		provider.on('status', handleStatus)
		provider.on('connect', handleConnect)
		provider.on('disconnect', handleDisconnect)
		provider.on('close', handleClose)

		// 定期检查同步状态（作为备用方案）
		const checkSyncInterval = setInterval(() => {
			if (provider.isSynced && !isSynced) {
				console.log('检测到文档已同步（通过轮询）')
				setIsSynced(true)
				setConnectionStatus('connected')
			}
		}, 1000)

		return () => {
			clearInterval(checkSyncInterval)
			provider.off('synced', handleSynced)
			provider.off('status', handleStatus)
			provider.off('connect', handleConnect)
			provider.off('disconnect', handleDisconnect)
			provider.off('close', handleClose)
		}
	}, [provider, isSynced])

	// Create editor and binding
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				history: false, // history is handled by yjs
			}),
			UuidExtension,
			CollaborationCursor.configure({
				provider: provider,
				user: {
					name: userName,
					color: '#3b82f6',
				},
			}),
		],
		content: '',
		editable: false, // Will be enabled after connection/sync
	})

	// Update editor editable state when connection/sync status changes
	useEffect(() => {
		if (editor) {
			const shouldBeEditable = isSynced || connectionStatus === 'connected'
			if (editor.isEditable !== shouldBeEditable) {
				editor.setEditable(shouldBeEditable)
				console.log('编辑器可编辑状态已更新:', shouldBeEditable)
			}
		}
	}, [editor, isSynced, connectionStatus])

	// Create master document binding
	const binding = useMemo(() => {
		if (!editor) return null
		// Create binding when editor is ready and connected
		// Note: MasterDocumentBinding might need sync, but we'll create it when connected
		if (isSynced || connectionStatus === 'connected') {
			try {
				// Get SERVER_SYNC_ORIGIN from provider to prevent circular updates
				const serverSyncOrigin = provider?.getServerSyncOrigin?.() || null
				return new MasterDocumentBinding(masterYdoc, editor, serverSyncOrigin)
			} catch (error) {
				console.error('创建 MasterDocumentBinding 失败:', error)
				return null
			}
		}
		return null
	}, [editor, masterYdoc, isSynced, connectionStatus, provider])

	// Handle batch sync step (if supported by custom server)
	// Note: Standard Hocuspocus server doesn't support BatchSyncStep messages.
	// Subdocs are automatically synced through the main document's Y.Map.
	// This handler is kept for potential future use with custom servers.
	useEffect(() => {
		if (!provider || !binding) return

		provider.handleBatchSyncStep = (subdocIds: string[], updates: Map<string, Uint8Array>) => {
			// Apply updates to subdocs
			updates.forEach((update, subdocId) => {
				const childYdoc = binding.getChildDoc(subdocId)
				if (childYdoc) {
					Y.applyUpdate(childYdoc, update, provider)
				}
			})

			// Load subdocs that need to be loaded
			subdocIds.forEach((subdocId) => {
				const childYdoc = binding.getChildDoc(subdocId)
				if (childYdoc && !childYdoc.isLoaded) {
					childYdoc.load()
				}
			})
		}

		return () => {
			provider.handleBatchSyncStep = undefined
		}
	}, [provider, binding])

	// Mount objects to window for debugging
	useEffect(() => {
		// Initialize or update window.collabEditor
		if (!(window as any).collabEditor) {
			;(window as any).collabEditor = {}
		}

		// Always update references to ensure we have the latest instances
		;(window as any).collabEditor.provider = provider
		;(window as any).collabEditor.masterYdoc = masterYdoc
		;(window as any).collabEditor.editor = editor
		;(window as any).collabEditor.masterYdocBinding = binding

		if (binding) {
			console.log('🔧 调试对象已更新到 window.collabEditor:')
			console.log('  - window.collabEditor.provider (HocuspocusProvider)')
			console.log('  - window.collabEditor.masterYdoc (Y.Doc)')
			console.log('  - window.collabEditor.editor (Tiptap Editor)')
			console.log('  - window.collabEditor.masterYdocBinding (MasterDocumentBinding)')
			console.log(`  - blockBindings size: ${binding.blockBindings.size}`)
		}

		// Cleanup on unmount
		return () => {
			if ((window as any).collabEditor) {
				delete (window as any).collabEditor
			}
		}
	}, [provider, masterYdoc, editor, binding])


	const statusColors: Record<string, string> = {
		connected: '#10b981',
		connecting: '#f59e0b',
		disconnected: '#ef4444',
		closed: '#6b7280',
	}

	return (
		<div>
			<div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
				连接状态: 
				<span style={{ 
					color: statusColors[connectionStatus] || '#666',
					fontWeight: 'bold',
					marginLeft: 4
				}}>
					{connectionStatus === 'connected' ? '✅ 已连接' :
					 connectionStatus === 'connecting' ? '🔄 连接中...' :
					 connectionStatus === 'disconnected' ? '❌ 已断开' :
					 '⚠️  已关闭'}
				</span>
			</div>
			<div
				style={{
					border: '1px solid #e5e7eb',
					borderRadius: 8,
					padding: 16,
					minHeight: 240,
					background: '#fff',
				}}
			>
				<EditorContent editor={editor} />
			</div>
		</div>
	)
}


