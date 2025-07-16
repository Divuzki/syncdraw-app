import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Play } from 'lucide-react'
import Button from '../ui/Button'

interface SessionCardProps {
  session: any
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const navigate = useNavigate()

  const handleJoinSession = () => {
    navigate(`/session/${session.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">{session.name}</h3>
          <p className="text-sm text-muted-foreground">
            Created {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{session.participants || 0} users</span>
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>2h ago</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {/* User avatars */}
          <div className="w-6 h-6 bg-primary rounded-full border-2 border-card"></div>
          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-card"></div>
          <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-card"></div>
        </div>
        
        <Button size="sm" onClick={handleJoinSession}>
          <Play className="w-3 h-3 mr-1" />
          Join
        </Button>
      </div>
    </motion.div>
  )
}

export default SessionCard