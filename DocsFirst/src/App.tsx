import { useMemo } from 'react'
import CollabEditor from './CollabEditor'
import './style.css'

export default function App() {
	return (
		<div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
			<h1>DocsFirst - Collaborative Editor</h1>
			<p style={{ color: '#666' }}>
				Connected to the Y-WebSocket demo server. Open this page in another browser to collaborate.
			</p>
			<CollabEditor
				roomName={useMemo(() => 'docsfirst-demo-room', [])}
				host="wss://demos.yjs.dev"
				userName="User"
			/>
		</div>
	)
}


