import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { CollaborationCursor } from './collaboration/collaboration-cursor'
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

	// Wait for master doc to sync
	useEffect(() => {
		const handleSynced = () => {
			setIsSynced(true)
		}

		provider.on('synced', handleSynced)

		return () => {
			provider.off('synced', handleSynced)
		}
	}, [provider])

	// Create editor and binding
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				history: false, // history is handled by yjs
			}),
			CollaborationCursor.configure({
				provider: provider,
				user: {
					name: userName,
					color: '#3b82f6',
				},
			}),
		],
		content: '',
		editable: isSynced, // Only enable editor after sync
	})

	// Create master document binding
	const binding = useMemo(() => {
		if (!editor || !isSynced) return null
		return new MasterDocumentBinding(masterYdoc, editor)
	}, [editor, masterYdoc, isSynced])

	// Handle batch sync step
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

	useEffect(() => {
		return () => {
			binding?.destroy()
			provider.destroy()
			masterYdoc.destroy()
			editor?.destroy()
		}
	}, [editor, provider, masterYdoc, binding])

	return (
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
	)
}


