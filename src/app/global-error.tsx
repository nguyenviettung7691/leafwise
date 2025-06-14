'use client' // Error boundaries must be Client Components

import { useEffect } from 'react';
// import { Analytics } from 'aws-amplify/analytics';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Amplify Analytics
    // Analytics.record({
    //   name: 'ClientRuntimeError',
    //   attributes: {
    //     message: error.message,
    //     stack: error.stack,
    //     digest: error.digest,
    //     // You can add more custom attributes if needed
    //     // e.g., userAgent: navigator.userAgent,
    //     // timestamp: new Date().toISOString(),
    //   },
    // }).catch(e => console.error("Failed to record error to Amplify Analytics:", e));
  }, [error]);

  return (
    // global-error must include html and body tags
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
          <h1 style={{ fontSize: '2em', color: '#ff6347', marginBottom: '20px' }}>Oops! Something went wrong.</h1>
          <p style={{ fontSize: '1.2em', color: '#555', marginBottom: '10px' }}>We've encountered an unexpected issue.</p>
          <p style={{ fontSize: '1em', color: '#777', marginBottom: '30px' }}>Our team has been notified. Please try again, or contact support if the problem persists.</p>
          <button onClick={() => reset()} style={{ padding: '10px 20px', fontSize: '1em', color: 'white', backgroundColor: '#32CD32', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Try again</button>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '5px', textAlign: 'left', maxWidth: '800px', overflowX: 'auto' }}>
              Error: {error.message}{error.digest ? ` (Digest: ${error.digest})` : ''}{'\n'}
              Stack: {error.stack}
            </pre>
          )}
        </div>
      </body>
    </html>
  )
}