import { auth } from "./firebase";
import { signInWithCustomToken } from "firebase/auth";

interface OAuthCodeExchangeResponse {
  success: boolean;
  customToken?: string;
  userData?: any; // User data from OAuth provider
  error?: string;
}

/**
 * Exchange OAuth authorization code for Firebase custom token
 * Calls the backend server to exchange the code for a proper JWT token
 */
export async function exchangeCodeForFirebaseToken(
  code: string,
  provider: string,
  state?: string
): Promise<OAuthCodeExchangeResponse> {
  try {
    console.log("Exchanging code for token:", { code, provider, state });

    // Call the backend server to exchange the code for a custom token
  const response = await fetch(`${import.meta.env.VITE_SOCKET_SERVER_URL}/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, provider, state }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.customToken) {
      throw new Error("No custom token received from server");
    }

    return {
      success: true,
      customToken: data.customToken,
      userData: data.user, // Include the user data from server
    };
  } catch (error) {
    console.error("Token exchange error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token exchange failed",
    };
  }
}

/**
 * Sign in to Firebase using a custom token obtained from OAuth code exchange
 */
export async function signInWithOAuthCode(
  code: string,
  provider: string,
  state?: string
) {
  try {
    // Exchange code for custom token
    const tokenResponse = await exchangeCodeForFirebaseToken(
      code,
      provider,
      state
    );

    if (!tokenResponse.success || !tokenResponse.customToken) {
      throw new Error(tokenResponse.error || "Failed to get custom token");
    }

    // Sign in to Firebase with custom token
    const userCredential = await signInWithCustomToken(
      auth,
      tokenResponse.customToken
    );

    return {
      success: true,
      user: userCredential.user,
      userData: tokenResponse.userData, // Pass through the user data from server
    };
  } catch (error) {
    console.error("OAuth sign-in error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sign-in failed",
    };
  }
}
