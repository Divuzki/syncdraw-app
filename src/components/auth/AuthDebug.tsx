import React from 'react'
import { auth } from '../../services/firebase'

const AuthDebug: React.FC = () => {
  const checkFirebaseConfig = () => {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

    console.log('Firebase Config:', config)
    console.log('Auth instance:', auth)
    console.log('Current URL:', window.location.href)
    
    // Check if any config values are undefined
    const missingKeys = Object.entries(config)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
    
    if (missingKeys.length > 0) {
      console.error('Missing Firebase environment variables:', missingKeys)
      alert(`Missing Firebase environment variables: ${missingKeys.join(', ')}`)
    } else {
      console.log('All Firebase environment variables are set')
      alert('Firebase config looks good! Check console for details.')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={checkFirebaseConfig}
        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
      >
        Debug Auth
      </button>
    </div>
  )
}

export default AuthDebug