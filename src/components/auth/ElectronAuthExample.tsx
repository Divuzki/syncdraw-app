import { useElectronAuth } from '@/hooks/useElectronAuth';
import Button from '@/components/ui/Button';

/**
 * Example component demonstrating how to use the useElectronAuth hook
 * This component shows how to integrate Electron authentication in React
 */
export function ElectronAuthExample() {
  const { user, loading, error, loginWithPopup, logout, isElectron } = useElectronAuth();

  if (!isElectron) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-800">
          Electron authentication is only available in the desktop app.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center space-x-4">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <h3 className="font-semibold text-green-800">{user.displayName}</h3>
            <p className="text-green-600">{user.email}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="mt-4"
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Sign in with:</h3>
      <div className="space-y-2">
        <Button
          onClick={() => loginWithPopup('google')}
          className="w-full"
          variant="outline"
        >
          Sign in with Google
        </Button>
        <Button
          onClick={() => loginWithPopup('github')}
          className="w-full"
          variant="outline"
        >
          Sign in with GitHub
        </Button>
        <Button
          onClick={() => loginWithPopup('apple')}
          className="w-full"
          variant="outline"
        >
          Sign in with Apple
        </Button>
      </div>
    </div>
  );
}

export default ElectronAuthExample;