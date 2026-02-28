'use client'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Error Occurred</h1>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
