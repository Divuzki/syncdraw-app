import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User, Settings } from 'lucide-react'
import { User as FirebaseUser } from 'firebase/auth'
import Button from './Button'

interface UserProfileProps {
  user: FirebaseUser
  onLogout: () => void
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <img
          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6366f1&color=fff`}
          alt={user.displayName || 'User'}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium text-foreground hidden sm:block">
          {user.displayName}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20"
            >
              <div className="p-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6366f1&color=fff`}
                    alt={user.displayName || 'User'}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-foreground">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <hr className="my-2 border-border" />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserProfile