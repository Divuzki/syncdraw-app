import { auth, db } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, User } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

interface PasskeyCredential {
  id: string
  rawId: ArrayBuffer
  response: {
    clientDataJSON: ArrayBuffer
    attestationObject?: ArrayBuffer
    authenticatorData?: ArrayBuffer
    signature?: ArrayBuffer
    userHandle?: ArrayBuffer
  }
  type: string
}

interface PasskeyAuthenticationCredential {
  id: string
  rawId: ArrayBuffer
  response: {
    clientDataJSON: ArrayBuffer
    authenticatorData: ArrayBuffer
    signature: ArrayBuffer
    userHandle?: ArrayBuffer
  }
  type: string
}

class PasskeyAuthService {
  constructor() {
    // No server URL needed - PasskeyAuth only uses Firebase and WebAuthn APIs
  }

  // Encrypt data using AES-GCM
  private async encryptData(data: string, password: string): Promise<string> {
    // Input validation
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data for encryption')
    }
    if (!password || typeof password !== 'string' || password.length < 32) {
      throw new Error('Invalid password for encryption')
    }
    
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const passwordBuffer = encoder.encode(password)
    
    // Create key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )
    
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    )
    
    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length)
    
    return this.arrayBufferToBase64URL(combined.buffer)
  }
  
  // Decrypt data using AES-GCM
  private async decryptData(encryptedData: string, password: string): Promise<string> {
    // Input validation
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data')
    }
    if (!password || typeof password !== 'string' || password.length < 32) {
      throw new Error('Invalid password for decryption')
    }
    
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const passwordBuffer = encoder.encode(password)
    
    const combined = new Uint8Array(this.base64URLToArrayBuffer(encryptedData))
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const encrypted = combined.slice(28)
    
    // Create key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    )
    
    return decoder.decode(decryptedData)
  }

  // Check if WebAuthn is supported
  isSupported(): boolean {
    return !!(window.navigator.credentials && window.PublicKeyCredential)
  }

  // Get detailed support information for better user guidance
  getSupportInfo(): { supported: boolean; message: string; suggestions: string[] } {
    if (!window.navigator.credentials) {
      return {
        supported: false,
        message: 'Your browser does not support WebAuthn/Passkeys',
        suggestions: [
          'Update your browser to the latest version',
          'Try using Chrome, Firefox, Safari, or Edge',
          'Use Google OAuth as an alternative'
        ]
      }
    }

    if (!window.PublicKeyCredential) {
      return {
        supported: false,
        message: 'WebAuthn is not available in this environment',
        suggestions: [
          'Ensure you are using HTTPS (required for WebAuthn)',
          'Check if your device supports biometric authentication',
          'Try using a different device or browser'
        ]
      }
    }

    return {
      supported: true,
      message: 'Passkeys are supported on this device',
      suggestions: [
        'You can use built-in biometrics (Face ID, Touch ID, Windows Hello)',
        'External security keys (USB, NFC, Bluetooth) are also supported',
        'Passkeys work across all your devices when synced'
      ]
    }
  }

  // Generate a random user ID
  private generateUserId(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32))
  }

  // Get appropriate relying party ID for cross-device compatibility
  private getRelyingPartyId(): string {
    const hostname = window.location.hostname
    
    // For localhost development, use 'localhost'
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost'
    }
    
    // For IP addresses, use the full hostname
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname
    }
    
    // For regular domains, use the hostname
    return hostname
  }

  // Convert ArrayBuffer to Base64URL
  private arrayBufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
    if (!buffer) {
      throw new Error('Invalid ArrayBuffer for base64URL conversion')
    }
    
    let bytes: Uint8Array
    
    // Handle different input types
    if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer)
    } else if (buffer instanceof Uint8Array) {
      bytes = buffer
    } else {
      throw new Error('Invalid ArrayBuffer for base64URL conversion')
    }
    
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // Convert Base64URL to ArrayBuffer
  private base64URLToArrayBuffer(base64url: string): ArrayBuffer {
    if (!base64url || typeof base64url !== 'string') {
      throw new Error('Invalid base64URL string')
    }
    
    // Validate base64URL format
    if (!/^[A-Za-z0-9_-]*$/.test(base64url)) {
      throw new Error('Invalid base64URL characters')
    }
    
    const padding = '='.repeat((4 - base64url.length % 4) % 4)
    const base64 = (base64url + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes.buffer
    } catch (error) {
      throw new Error('Failed to decode base64URL string')
    }
  }

  // Constant-time string comparison to prevent timing attacks
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }

  // Input validation helper
  private validateInput(email: string, displayName?: string): void {
    // Email validation
    if (!email || typeof email !== 'string') {
      throw new Error('Valid email is required')
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }
    
    if (email.length > 254) {
      throw new Error('Email too long')
    }
    
    // Display name validation (if provided)
    if (displayName !== undefined) {
      if (typeof displayName !== 'string') {
        throw new Error('Display name must be a string')
      }
      
      if (displayName.length === 0) {
        throw new Error('Display name cannot be empty')
      }
      
      if (displayName.length > 100) {
        throw new Error('Display name too long')
      }
      
      // Check for potentially malicious content
      const dangerousChars = /<script|javascript:|data:|vbscript:|on\w+=/i
      if (dangerousChars.test(displayName)) {
        throw new Error('Display name contains invalid characters')
      }
    }
  }

  // Register a new passkey and create Firebase account
  async registerWithPasskey(email: string, displayName: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!this.isSupported()) {
        throw new Error('WebAuthn is not supported in this browser')
      }
      
      // Check if running in Electron and warn about potential issues
      const isElectron = typeof window !== 'undefined' && window.api?.auth
      if (isElectron) {
        console.warn('Running in Electron environment - some WebAuthn features may be limited')
      }
      
      // Validate inputs
      this.validateInput(email, displayName)

      // Generate a secure password for Firebase (user won't need to remember this)
      const firebasePassword = this.arrayBufferToBase64URL(crypto.getRandomValues(new Uint8Array(32)))

      // Generate a temporary user ID for the passkey creation
      const tempUserId = crypto.getRandomValues(new Uint8Array(32))
      const tempUserIdBase64 = this.arrayBufferToBase64URL(tempUserId)

      // Create WebAuthn credential
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: 'Syncdaw',
          // Use hostname but handle localhost and IP addresses properly
          id: this.getRelyingPartyId(),
        },
        user: {
          id: tempUserId, // Use temporary user ID for passkey creation
          name: email,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (most common)
          { alg: -257, type: 'public-key' }, // RS256
          { alg: -37, type: 'public-key' }, // PS256 (additional support for some devices)
          { alg: -35, type: 'public-key' }, // ES384 (additional elliptic curve support)
        ],
        authenticatorSelection: {
          // Remove authenticatorAttachment to allow both platform and cross-platform authenticators
          // This enables support for external security keys, mobile devices, and other authenticators
          userVerification: 'required', // Require user verification for security
          residentKey: 'required', // Require resident key for better security
          requireResidentKey: true, // Explicitly require resident key
        },
        timeout: 60000,
        attestation: 'none', // Use 'none' for privacy, 'direct' only if attestation is needed
      }

      // Create the credential with enhanced error handling
      let credential: PasskeyCredential
      try {
        credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        }) as PasskeyCredential

        if (!credential) {
          throw new Error('Failed to create passkey')
        }
      } catch (credentialError: any) {
        // Handle specific WebAuthn creation errors
        if (credentialError instanceof DOMException) {
          switch (credentialError.name) {
            case 'NotAllowedError':
              throw new Error('Passkey creation was cancelled or not allowed. Please try again and allow the passkey creation.')
            case 'AbortError':
              throw new Error('Passkey creation was cancelled. Please try again.')
            case 'TimeoutError':
              throw new Error('Passkey creation timed out. Please try again.')
            case 'SecurityError':
              throw new Error('Security error during passkey creation. Please ensure you are using HTTPS.')
            case 'UnknownError':
              throw new Error('An unknown error occurred during passkey creation. Please try again.')
            case 'InvalidStateError':
              throw new Error('A passkey for this account may already exist on this device.')
            case 'ConstraintError':
              throw new Error('Your device does not support the required passkey features.')
            default:
              throw new Error(`Passkey creation failed: ${credentialError.message || 'Unknown error'}`)
          }
        }
        throw new Error(`Failed to create passkey: ${credentialError.message || 'Unknown error'}`)
      }
      
      // Now create Firebase account after successful passkey creation
      let userCredential
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, firebasePassword)
      } catch (error: any) {
        console.error('Firebase user creation error:', error)
        
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('ACCOUNT_EXISTS_WITH_DIFFERENT_METHOD')
        } else if (error.code === 'auth/weak-password') {
          throw new Error('Generated password is too weak. Please try again.')
        } else if (error.code === 'auth/invalid-email') {
          throw new Error('Invalid email address format.')
        } else if (error.code === 'auth/operation-not-allowed') {
          throw new Error('Email/password accounts are not enabled. Please contact support.')
        } else if (error.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your connection and try again.')
        } else {
          throw new Error(`Failed to create account: ${error.message || 'Unknown error'}`)
        }
      }
      
      // Prepare passkey data for encryption
      // Note: The userHandle in the WebAuthn credential will be tempUserId, not Firebase UID
      // We need to store the mapping between tempUserId and Firebase UID
      const passkeyData = {
        credentialId: this.arrayBufferToBase64URL(credential.rawId),
        publicKey: this.arrayBufferToBase64URL(credential.response.attestationObject!),
        tempUserId: tempUserIdBase64, // Store the temp user ID that was used in the credential
        firebaseUid: userCredential.user.uid, // Store the actual Firebase UID
        firebasePassword: firebasePassword,
        createdAt: new Date().toISOString(),
      }

      // Encrypt passkey data using the Firebase password as encryption key
      const encryptedPasskeyData = await this.encryptData(
        JSON.stringify(passkeyData),
        firebasePassword
      )

      // Update user profile with display name only
      await updateProfile(userCredential.user, {
        displayName: displayName
      })

      // Wait a moment for the authentication state to fully propagate
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Ensure the user is still authenticated before proceeding
      if (!auth.currentUser || auth.currentUser.uid !== userCredential.user.uid) {
        throw new Error('Authentication state not properly established')
      }

      // Store UID-to-credentials mapping in Firestore for passkey-only authentication
      // Use the tempUserId as the document ID since that's what the passkey will return
      const safeUid = tempUserIdBase64
      
      try {
        // Prepare document data with proper validation
        const documentData = {
          email: email,
          firebasePassword: firebasePassword,
          originalUid: userCredential.user.uid,
          encryptedPasskeyData: encryptedPasskeyData,
          createdAt: serverTimestamp()
        }
        
        console.log('Attempting to save passkey data to Firestore:')
        console.log('- Document ID (safeUid):', safeUid)
        console.log('- Collection: passkeyMappings')
        console.log('- Document data keys:', Object.keys(documentData))
        console.log('- Firebase UID:', userCredential.user.uid)
        console.log('- Email:', email)
        console.log('- Current auth user:', auth.currentUser?.uid)
        console.log('- Auth state established:', !!auth.currentUser)
        console.log('- Document data validation:')
        console.log('  - email length:', documentData.email.length)
        console.log('  - firebasePassword length:', documentData.firebasePassword.length)
        console.log('  - originalUid length:', documentData.originalUid.length)
        console.log('  - encryptedPasskeyData length:', documentData.encryptedPasskeyData.length)
        
        // Validate document data before saving
        if (!documentData.email || !documentData.firebasePassword || !documentData.originalUid || !documentData.encryptedPasskeyData) {
          throw new Error('Missing required data for passkey storage')
        }
        
        console.log('Calling setDoc to save passkey mapping...')
        await setDoc(doc(db, 'passkeyMappings', safeUid), documentData)
        console.log('✅ Passkey data saved successfully to Firestore!')
      } catch (firestoreError: any) {
        console.error('Firestore error during passkey registration:', firestoreError)
        
        // Clean up Firebase user if Firestore fails
        try {
          await userCredential.user.delete()
        } catch (deleteError) {
          console.error('Failed to clean up Firebase user after Firestore error:', deleteError)
        }
        
        if (firestoreError.code === 'permission-denied') {
          throw new Error('Permission denied when saving passkey data. Please check your connection and try again.')
        } else if (firestoreError.code === 'unavailable') {
          throw new Error('Database temporarily unavailable. Please try again in a moment.')
        } else {
          throw new Error(`Failed to save passkey data: ${firestoreError.message || 'Unknown database error'}`)
        }
      }

      // Passkey data encrypted and stored successfully

      return {
        success: true,
        user: userCredential.user,
      }
    } catch (error: any) {
      console.error('Passkey registration error:', error)
      return {
        success: false,
        error: error.message || 'Failed to register passkey',
      }
    }
  }

  // Authenticate with existing passkey
  async authenticateWithPasskey(): Promise<{ success: boolean; user?: User; error?: string }> {
    const rateLimitId = 'passkey-auth-' + (window.location.hostname || 'unknown')
    
    try {
      if (!this.isSupported()) {
        throw new Error('WebAuthn is not supported in this browser')
      }
      
      // Check rate limiting for passkey authentication
      this.checkRateLimit(rateLimitId)

      // Create authentication request with empty allowCredentials to let the browser/device choose
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [], // Empty to allow any registered credential
        userVerification: 'required', // Require user verification for security
        timeout: 60000,
      }

      // Get the credential
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PasskeyAuthenticationCredential

      if (!credential) {
        throw new Error('No credentials available')
      }

      // Extract tempUserId from userHandle
      if (!credential.response.userHandle) {
        throw new Error('PASSKEY_MISSING_USER_HANDLE')
      }
      
      // The userHandle contains the tempUserId that was used during registration
      // Handle different userHandle types safely
      const userHandle = credential.response.userHandle as any
      let userHandleBuffer: ArrayBuffer
      
      if (userHandle instanceof ArrayBuffer) {
        userHandleBuffer = userHandle
      } else if (userHandle instanceof Uint8Array) {
        userHandleBuffer = userHandle.buffer
      } else if (userHandle && userHandle.buffer instanceof ArrayBuffer) {
        userHandleBuffer = userHandle.buffer
      } else {
        throw new Error('Invalid userHandle format')
      }
      
      // Convert the userHandle back to base64URL to use as document ID
      const safeUid = this.arrayBufferToBase64URL(userHandleBuffer)
      
      console.log('Passkey authentication - looking up user:')
      console.log('- Document ID (safeUid):', safeUid)
      console.log('- Collection: passkeyMappings')
      
      // Get user credentials from Firestore mapping
      const mappingDoc = await getDoc(doc(db, 'passkeyMappings', safeUid))
      if (!mappingDoc.exists()) {
        console.error('Document not found for safeUid:', safeUid)
        throw new Error('PASSKEY_USER_NOT_FOUND')
      }
      
      console.log('✅ Found passkey mapping document')

      const mappingData = mappingDoc.data()
      if (!mappingData) {
        throw new Error('PASSKEY_DATA_CORRUPTED')
      }
      
      const { email, firebasePassword, encryptedPasskeyData, originalUid } = mappingData
      
      // Validate required fields
      if (!email || !firebasePassword || !encryptedPasskeyData || !originalUid) {
        throw new Error('PASSKEY_DATA_INCOMPLETE')
      }
      
      // The originalUid should match the Firebase UID stored in the document
      // No need to validate against extracted userHandle since that's the tempUserId

      // Sign in with Firebase credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, firebasePassword)
      
      // Verify passkey data exists
      if (!encryptedPasskeyData) {
        throw new Error('PASSKEY_DATA_NOT_FOUND')
      }

      // Decrypt the passkey data
      const decryptedData = await this.decryptData(encryptedPasskeyData, firebasePassword)
      const storedCredential = JSON.parse(decryptedData)

      // Verify the credential ID matches using constant-time comparison
       const credentialId = this.arrayBufferToBase64URL(credential.rawId)
       if (!this.constantTimeCompare(storedCredential.credentialId, credentialId)) {
         throw new Error('PASSKEY_CREDENTIAL_MISMATCH')
       }

       // Passkey authentication successful
       this.recordAuthAttempt(rateLimitId, true)
       return {
         success: true,
         user: userCredential.user
       }
      
    } catch (error: any) {
      console.error('Passkey authentication error:', error)
      this.recordAuthAttempt(rateLimitId, false)
      
      // Handle specific WebAuthn errors
      let errorMessage = 'Failed to authenticate with passkey'
      
      if (error.message === 'PASSKEY_SIGNIN_REQUIRES_EMAIL') {
        errorMessage = 'PASSKEY_SIGNIN_REQUIRES_EMAIL'
      } else if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'NotAllowedError'
            break
          case 'AbortError':
            errorMessage = 'Passkey authentication was cancelled'
            break
          case 'TimeoutError':
            errorMessage = 'No credentials available'
            break
          case 'SecurityError':
            errorMessage = 'Security error during passkey authentication'
            break
          case 'UnknownError':
            errorMessage = 'No credentials available'
            break
          default:
            errorMessage = error.message || 'Failed to authenticate with passkey'
        }
      } else {
        errorMessage = error.message || 'Failed to authenticate with passkey'
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }



  // Rate limiting for authentication attempts
  private authAttempts = new Map<string, { count: number; lastAttempt: number }>()
  private readonly MAX_AUTH_ATTEMPTS = 5
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
  
  private checkRateLimit(identifier: string): void {
    const now = Date.now()
    const attempts = this.authAttempts.get(identifier)
    
    if (attempts) {
      // Reset if window has passed
      if (now - attempts.lastAttempt > this.RATE_LIMIT_WINDOW) {
        this.authAttempts.delete(identifier)
        return
      }
      
      // Check if rate limited
      if (attempts.count >= this.MAX_AUTH_ATTEMPTS) {
        const timeLeft = Math.ceil((this.RATE_LIMIT_WINDOW - (now - attempts.lastAttempt)) / 1000 / 60)
        throw new Error(`Too many authentication attempts. Please try again in ${timeLeft} minutes.`)
      }
    }
  }
  
  private recordAuthAttempt(identifier: string, success: boolean): void {
    const now = Date.now()
    const attempts = this.authAttempts.get(identifier) || { count: 0, lastAttempt: now }
    
    if (success) {
      // Clear attempts on success
      this.authAttempts.delete(identifier)
    } else {
      // Increment failed attempts
      attempts.count += 1
      attempts.lastAttempt = now
      this.authAttempts.set(identifier, attempts)
    }
  }

  // Authenticate with passkey using email hint
  async authenticateWithPasskeyAndEmail(email: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!this.isSupported()) {
        throw new Error('WebAuthn is not supported in this browser')
      }
      
      // Validate input
      this.validateInput(email)
      
      // Check rate limiting
      this.checkRateLimit(email)

      // Note: We can't check if user exists beforehand due to Firebase email enumeration protection
      // We'll handle authentication and let Firebase return appropriate errors

      // Create authentication request
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [], // Let the authenticator choose
        userVerification: 'required', // Require user verification for security
        timeout: 60000,
      }

      // Get the credential
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PasskeyAuthenticationCredential

      if (!credential) {
        throw new Error('No credentials available')
      }

      // Extract Firebase UID from userHandle
      if (!credential.response.userHandle) {
        throw new Error('PASSKEY_MISSING_USER_HANDLE')
      }
      
      // The userHandle contains the UTF-8 encoded Firebase UID, decode it properly
      // Handle different userHandle types safely
      const userHandle = credential.response.userHandle as any
      let userHandleBuffer: ArrayBuffer
      
      if (userHandle instanceof ArrayBuffer) {
        userHandleBuffer = userHandle
      } else if (userHandle instanceof Uint8Array) {
        userHandleBuffer = userHandle.buffer
      } else if (userHandle && userHandle.buffer instanceof ArrayBuffer) {
        userHandleBuffer = userHandle.buffer
      } else {
        throw new Error('Invalid userHandle format')
      }
      
      const firebaseUid = new TextDecoder().decode(userHandleBuffer)
      
      // Encode the UID to make it safe for Firestore document ID
      const safeUid = this.arrayBufferToBase64URL(new TextEncoder().encode(firebaseUid))
      
      // Get user credentials from Firestore mapping
      const mappingDoc = await getDoc(doc(db, 'passkeyMappings', safeUid))
      if (!mappingDoc.exists()) {
        throw new Error('PASSKEY_USER_NOT_FOUND')
      }

      const mappingData = mappingDoc.data()
      if (!mappingData) {
        throw new Error('PASSKEY_DATA_CORRUPTED')
      }
      
      const { email: storedEmail, firebasePassword, encryptedPasskeyData, originalUid } = mappingData
      
      // Validate required fields
      if (!storedEmail || !firebasePassword || !encryptedPasskeyData || !originalUid) {
        throw new Error('PASSKEY_DATA_INCOMPLETE')
      }
      
      // Validate that the originalUid matches the extracted firebaseUid
      if (originalUid !== firebaseUid) {
        throw new Error('PASSKEY_UID_MISMATCH')
      }
      
      // Verify email matches
      if (storedEmail !== email) {
        throw new Error('Email does not match passkey')
      }

      // Sign in with Firebase credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, firebasePassword)
      
      // Verify passkey data exists
      if (!encryptedPasskeyData) {
        throw new Error('PASSKEY_DATA_NOT_FOUND')
      }

      // Decrypt the passkey data
      const decryptedData = await this.decryptData(encryptedPasskeyData, firebasePassword)
      const storedCredential = JSON.parse(decryptedData)

      // Verify the credential ID matches using constant-time comparison
      const credentialId = this.arrayBufferToBase64URL(credential.rawId)
      if (!this.constantTimeCompare(storedCredential.credentialId, credentialId)) {
        throw new Error('PASSKEY_CREDENTIAL_MISMATCH')
      }

      // Passkey authentication successful
      this.recordAuthAttempt(email, true)
      return {
        success: true,
        user: userCredential.user,
      }
      
    } catch (error: any) {
      console.error('Passkey authentication with email error:', error)
      this.recordAuthAttempt(email, false)
      
      let errorMessage = 'Failed to authenticate with passkey'
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'NotAllowedError'
            break
          case 'AbortError':
            errorMessage = 'Passkey authentication was cancelled'
            break
          case 'TimeoutError':
            errorMessage = 'No credentials available'
            break
          case 'SecurityError':
            errorMessage = 'Security error during passkey authentication'
            break
          case 'UnknownError':
            errorMessage = 'No credentials available'
            break
          default:
            errorMessage = error.message || 'Failed to authenticate with passkey'
        }
      } else {
        errorMessage = error.message || 'Failed to authenticate with passkey'
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

export const passkeyAuth = new PasskeyAuthService()
export default passkeyAuth