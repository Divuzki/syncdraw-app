import React from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Music, Github, Chrome, Apple } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

const Auth: React.FC = () => {
  const { user, loading, signInWithGoogle, signInWithGithub, signInWithApple } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Syncdaw</h1>
            <p className="text-muted-foreground">
              Collaborate on your DAW projects in real-time
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              <Chrome className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>

            <Button
              onClick={signInWithApple}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              <Apple className="w-5 h-5 mr-3" />
              Continue with Apple
            </Button>

            <Button
              onClick={signInWithGithub}
              variant="outline"
              size="lg"
              className="w-full justify-start"
            >
              <Github className="w-5 h-5 mr-3" />
              Continue with GitHub
            </Button>
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
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </motion.div>
    </div>
  )
}

export default Auth