import { useMemo } from 'react'
import CollabEditor from './CollabEditor'
import './style.css'

export default function App() {
	return (
		<div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
			<h1>DocsFirst - Collaborative Editor</h1>
			<p style={{ color: '#666' }}>
				Connecting to Hocuspocus server. If connection fails, you may need to run a local Hocuspocus server.
			</p>
			<CollabEditor
				roomName={useMemo(() => 'docsfirst-demo-room', [])}
				host="ws://localhost:1234"
				userName="User"
			/>
		</div>
	)
}


