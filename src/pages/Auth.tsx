import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Chrome, Key, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import AuthDebug from "../components/auth/AuthDebug";
import { passkeyAuth } from "../services/passkeyAuth";
import toast from "react-hot-toast";

const Auth: React.FC = () => {
  const {
    user,
    loading,
    isAuthenticating,
    authProvider,
    signInWithGoogle,
    signInWithPasskey,
    registerWithPasskey,
  } = useAuth();
  const [showPasskeyForm, setShowPasskeyForm] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [webAuthnSupport, setWebAuthnSupport] = useState<{
    supported: boolean;
    message: string;
    suggestions: string[];
  } | null>(null);
  const [passkeyAuthFailed, setPasskeyAuthFailed] = useState(false);

  // Check WebAuthn support on component mount
  useEffect(() => {
    const supportInfo = passkeyAuth.getSupportInfo();
    setWebAuthnSupport(supportInfo);
  }, []);

  // Debug authentication state
  useEffect(() => {
    console.log('Auth page - user:', user);
    console.log('Auth page - loading:', loading);
    console.log('Auth page - isAuthenticating:', isAuthenticating);
    console.log('Auth page - authProvider:', authProvider);
    console.log('Auth page - current URL:', window.location.href);
  }, [user, loading, isAuthenticating, authProvider]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  const handlePasskeySignIn = async () => {
    setPasskeyAuthFailed(false); // Reset failed state on new attempt
    try {
      // First, try passkey-only authentication (new Firestore-based approach)
      if (!email) {
        const result = await passkeyAuth.authenticateWithPasskey();
        if (result.success && result.user) {
          toast.success("Successfully signed in with passkey!");
          return;
        } else {
          throw new Error(
            result.error || "Failed to authenticate with passkey"
          );
        }
      } else {
        // If email is provided, use the email-based authentication as fallback
        const result = await passkeyAuth.authenticateWithPasskeyAndEmail(email);
        if (result.success && result.user) {
          toast.success("Successfully signed in with passkey!");
          return;
        } else {
          throw new Error(
            result.error || "Failed to authenticate with passkey"
          );
        }
      }
    } catch (error: any) {
      setPasskeyAuthFailed(true); // Set failed state on error

      // Handle specific error messages
      if (
        error.message &&
        error.message.includes("PASSKEY_MISSING_USER_HANDLE")
      ) {
        toast.error(
          "This passkey was created with an older version. Please enter your email to sign in."
        );
      } else if (
        error.message &&
        error.message.includes("PASSKEY_USER_NOT_FOUND")
      ) {
        toast.error(
          "No account found for this passkey. Please create an account or use Google sign-in."
        );
      } else if (error.message && error.message.includes("User not found")) {
        setShowPasskeyForm(true);
        toast.error(
          "No passkey found for this device. Create an account or try a different device."
        );
      } else if (
        error.message &&
        error.message.includes("No credentials available")
      ) {
        // Handle case where user cancels or no passkeys are available
        toast.error(
          "No passkey found. Please create an account or use Google sign-in."
        );
      } else if (error.message && error.message.includes("NotAllowedError")) {
        // Handle user cancellation
        toast.error("Passkey authentication was cancelled. Please try again.");
      } else if (
        error.message &&
        error.message.includes("No account found with this email")
      ) {
        toast.error(
          "No account found with this email. Please create an account or use Google sign-in."
        );
      } else if (
        error.message &&
        error.message.includes("Could not authenticate with passkey")
      ) {
        toast.error(
          "Could not authenticate with passkey. Please check your email and try again."
        );
      } else {
        toast.error(error.message || "Failed to sign in with passkey");
      }
    }
  };

  // Note: checkForExistingGoogleAccount removed due to Firebase email enumeration protection
  // Account conflicts will be handled during the registration process

  const handleCreateAccountClick = async () => {
    // Simply show the passkey registration form
    setShowPasskeyForm(true);
    setPasskeyAuthFailed(false);
  };

  const handlePasskeyRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields before proceeding
    if (!email || !email.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!displayName || !displayName.trim()) {
      toast.error("Please enter your display name");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate display name length
    if (displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters long");
      return;
    }

    if (displayName.trim().length > 50) {
      toast.error("Display name must be less than 50 characters");
      return;
    }

    setIsRegistering(true);

    // Show loading message for passkey creation
    toast.loading("Creating your passkey account...", { duration: 2000 });

    try {
      const result = await registerWithPasskey(
        email.trim(),
        displayName.trim()
      );
      if (result.success) {
        toast.success(
          "Account created successfully! You are now signed in with your passkey."
        );
        setShowPasskeyForm(false);
        setEmail("");
        setDisplayName("");
      } else {
        // Check if the error is about existing Google account
        if (
          result.error &&
          result.error.includes("ACCOUNT_EXISTS_WITH_DIFFERENT_METHOD")
        ) {
          toast.error(
            "An account with this email already exists. Please sign in with Google instead."
          );
        } else if (
          result.error &&
          result.error.includes("ACCOUNT_EXISTS_WITH_GOOGLE")
        ) {
          toast.error(
            "An account with this email already exists. Please sign in with Google instead."
          );
        } else if (
          result.error &&
          result.error.includes("Passkey creation was cancelled")
        ) {
          toast.error(
            "Passkey creation was cancelled. Please click 'Create Passkey Account' again and allow the passkey creation when prompted by your browser or device.",
            { duration: 6000 }
          );
        } else {
          toast.error(
            result.error ||
              "Failed to create passkey account. Please try again."
          );
        }
      }
    } catch (error: any) {
      // Check if the error is about existing Google account
      if (
        error.message &&
        (error.message.includes("ACCOUNT_EXISTS_WITH_GOOGLE") ||
          error.message.includes("ACCOUNT_EXISTS_WITH_DIFFERENT_METHOD"))
      ) {
        toast.error(
          "An account with this email already exists. Please sign in with Google instead."
        );
      } else if (
        error.message &&
        error.message.includes("Passkey creation was cancelled")
      ) {
        toast.error(
          "Passkey creation was cancelled. Please click 'Create Passkey Account' again and allow the passkey creation when prompted by your browser or device.",
          { duration: 6000 }
        );
      } else {
        toast.error(
          error.message || "Failed to create passkey account. Please try again."
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // Show waiting for login state when authenticating
  if (isAuthenticating && authProvider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 text-center">
            {/* Logo and Header */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6"
            >
              <Music className="w-8 h-8 text-primary-foreground" />
            </motion.div>

            {/* Waiting Animation */}
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Waiting for login
              </h2>
              <p className="text-muted-foreground mb-4">
                {typeof window !== "undefined" && window.api?.auth
                  ? `Complete your ${authProvider} sign-in in the browser that just opened`
                  : `Complete your ${authProvider} sign-in in the browser window`}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                  A browser window has opened for authentication
                </div>
                <div className="flex items-center justify-center">
                  <div
                    className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  Sign in with your {authProvider} account
                </div>
                <div className="flex items-center justify-center">
                  <div
                    className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  Return to this window when complete
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-xs text-muted-foreground mb-4">
              If the browser window didn't open, please allow popups for this
              site and try again.
            </div>

            {/* Cancel Button */}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              Cancel and try again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4"
            >
              <Music className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to Syncdaw
            </h1>
            <p className="text-muted-foreground">
              Collaborate on your DAW projects in real-time
            </p>
          </div>

          {/* Authentication Options */}
          <div className="space-y-3">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              size="lg"
              className="w-full justify-start"
              disabled={loading}
              data-testid="google-signin"
            >
              <Chrome className="w-5 h-5 mr-3" />
              {loading ? "Signing in..." : "Continue with Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            {!showPasskeyForm ? (
              <div className="space-y-3">
                <Button
                  onClick={handlePasskeySignIn}
                  variant="outline"
                  size="lg"
                  className="w-full justify-start"
                  disabled={loading || webAuthnSupport?.supported === false}
                  data-testid="passkey-signin"
                >
                  <Key className="w-5 h-5 mr-3" />
                  {loading
                    ? "Authenticating..."
                    : webAuthnSupport?.supported === false
                    ? "Passkeys not supported"
                    : "Sign in with Passkey"}
                </Button>

                {/* Show additional options when passkey auth fails */}
                {passkeyAuthFailed && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-muted-foreground text-center">
                      <AlertCircle className="w-4 h-4 mx-auto mb-2 text-amber-500" />
                      No passkey found or authentication failed
                    </div>

                    <div className="space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email to create account"
                        className="w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                      />

                      <div className="flex space-x-2">
                        <Button
                          onClick={handlePasskeySignIn}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={loading}
                        >
                          Try Again
                        </Button>

                        <Button
                          onClick={handleCreateAccountClick}
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          disabled={loading || !email}
                        >
                          Create Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handlePasskeyRegister} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Enter your email address"
                    data-testid="email-input"
                    autoComplete="email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for account creation
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Display Name *
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Enter your display name (2-50 characters)"
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be your visible name (2-50 characters)
                  </p>
                </div>

                <div className="mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Creating your account:
                    </h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Enter your email and display name below</li>
                      <li>
                        • Click "Create Passkey Account" to set up your new
                        account
                      </li>
                      <li>
                        • Your browser/device will prompt you to create a passkey
                      </li>
                      <li>
                        • <strong>Important:</strong> Allow the passkey creation when prompted
                      </li>
                      <li>
                        • You'll be automatically signed in after creation
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={
                      isRegistering ||
                      loading ||
                      !email?.trim() ||
                      !displayName?.trim()
                    }
                    size="lg"
                    className="flex-1"
                  >
                    <Key className="w-5 h-5 mr-2" />
                    {isRegistering
                      ? "Creating Account..."
                      : "Create Passkey Account"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setShowPasskeyForm(false);
                      setEmail("");
                      setDisplayName("");
                      setPasskeyAuthFailed(false);
                    }}
                    disabled={isRegistering || loading}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Real-time collaboration
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Cloud file synchronization
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Version control for projects
              </div>
            </div>
          </div>

          {/* Passkey Compatibility Info */}
          {webAuthnSupport && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-xs space-y-2">
                <div
                  className={`flex items-center justify-center ${
                    webAuthnSupport.supported
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {webAuthnSupport.supported ? (
                    <Key className="w-3 h-3 mr-2" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-2" />
                  )}
                  <span>{webAuthnSupport.message}</span>
                </div>

                {webAuthnSupport.supported ? (
                  <div className="text-center text-muted-foreground space-y-1">
                    {webAuthnSupport.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-center"
                      >
                        <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground space-y-1">
                    <div className="font-medium mb-1">
                      Try these alternatives:
                    </div>
                    {webAuthnSupport.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-center"
                      >
                        <div className="w-1 h-1 bg-amber-500 rounded-full mr-2"></div>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </motion.div>

      {/* Debug Component - Remove in production */}
      <AuthDebug />
    </div>
  );
};

export default Auth;
