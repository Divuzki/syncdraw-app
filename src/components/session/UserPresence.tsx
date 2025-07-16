import React from 'react'
import { motion } from 'framer-motion'

interface UserPresenceProps {
  users: any[]
}

const UserPresence: React.FC<UserPresenceProps> = ({ users }) => {
  const displayUsers = users.slice(0, 3)
  const remainingCount = users.length - 3

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <motion.div
            key={user.userId}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6366f1&color=fff`}
              alt={user.displayName}
              className="w-8 h-8 rounded-full border-2 border-background"
              title={user.displayName}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
          </motion.div>
        ))}
        
        {remainingCount > 0 && (
          <div className="flex items-center justify-center w-8 h-8 bg-muted border-2 border-background rounded-full text-xs font-medium text-muted-foreground">
            +{remainingCount}
          </div>
        )}
      </div>
      
      <span className="text-sm text-muted-foreground">
        {users.length} online
      </span>
    </div>
  )
}

export default UserPresence