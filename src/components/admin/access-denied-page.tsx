'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ShieldX, 
  AlertTriangle, 
  Ban, 
  LogOut, 
  Home, 
  Clock,
  Lock,
  Eye
} from 'lucide-react'

interface AccessDeniedPageProps {
  reason?: 'unauthorized' | 'blocked' | 'rate_limited' | 'suspicious'
  message?: string
  remainingMinutes?: number
  showDebug?: boolean
}

export function AccessDeniedPage({ 
  reason = 'unauthorized', 
  message,
  remainingMinutes,
  showDebug = false 
}: AccessDeniedPageProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(remainingMinutes || 0)
  const [ipAddress, setIpAddress] = useState<string>('')
  
  useEffect(() => {
    // Fetch IP for display
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'))
  }, [])
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 60000)
      return () => clearTimeout(timer)
    }
  }, [countdown])
  
  const getContent = () => {
    switch (reason) {
      case 'blocked':
        return {
          icon: <Ban className="w-20 h-20 text-red-500" />,
          title: 'Access Permanently Restricted',
          subtitle: 'Your access has been blocked due to suspicious activity',
          description: 'Our security systems have detected unusual activity from your connection. This decision is final and cannot be appealed through this interface.',
          color: 'red',
          showTimer: false
        }
      case 'rate_limited':
        return {
          icon: <Clock className="w-20 h-20 text-orange-500" />,
          title: 'Temporarily Locked Out',
          subtitle: 'Too many failed attempts detected',
          description: `Your access has been temporarily restricted for security purposes. Please wait ${countdown > 0 ? `${countdown} minute${countdown === 1 ? '' : 's'}` : 'a while'} before trying again.`,
          color: 'orange',
          showTimer: countdown > 0
        }
      case 'suspicious':
        return {
          icon: <AlertTriangle className="w-20 h-20 text-yellow-500" />,
          title: 'Suspicious Activity Detected',
          subtitle: 'Your access has been flagged for review',
          description: 'Our automated security systems have identified potentially malicious behavior from your connection. This incident has been logged.',
          color: 'yellow',
          showTimer: false
        }
      default:
        return {
          icon: <ShieldX className="w-20 h-20 text-red-500" />,
          title: 'Access Denied',
          subtitle: 'You are not authorized to access this area',
          description: 'This administrative portal is exclusively for authorized DuukaAfrica administrators. If you believe this is an error, contact the system administrator.',
          color: 'red',
          showTimer: false
        }
    }
  }
  
  const content = getContent()
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.03) 10px,
              rgba(255,255,255,0.03) 20px
            )`
          }} />
        </div>
      </div>
      
      <div className="relative max-w-lg w-full">
        {/* Warning Header Bar */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-t-lg p-3 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium tracking-wider uppercase">
            Restricted Access Zone
          </span>
        </div>
        
        {/* Main Card */}
        <div className="bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-b-lg shadow-2xl">
          <div className="p-8 text-center">
            {/* Icon with pulse animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                <div className="relative bg-gray-800 p-6 rounded-full border border-gray-700">
                  {content.icon}
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-2">
              {content.title}
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-gray-400 mb-4">
              {content.subtitle}
            </p>
            
            {/* Description */}
            <p className="text-gray-500 mb-6 leading-relaxed">
              {message || content.description}
            </p>
            
            {/* Timer if applicable */}
            {content.showTimer && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-orange-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono text-2xl">{countdown}:00</span>
                  <span className="text-sm">minutes remaining</span>
                </div>
              </div>
            )}
            
            {/* Security Notice */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-gray-400">
                    <strong className="text-gray-300">Security Notice:</strong> This incident has been logged and monitored.
                    Unauthorized access attempts are recorded and may be reported to relevant authorities.
                    All administrative actions require proper authorization.
                  </p>
                </div>
              </div>
            </div>
            
            {/* IP Display */}
            <div className="text-xs text-gray-600 mb-6">
              Reference ID: {ipAddress || 'Loading...'} • {new Date().toISOString()}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => router.push('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Homepage
              </Button>
              
              {reason === 'unauthorized' && (
                <Button
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-gray-400"
                  onClick={() => router.push('/sign-in')}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign in with Different Account
                </Button>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-800 p-4 bg-gray-900/50">
            <p className="text-xs text-gray-600 text-center">
              DuukaAfrica Administrative Portal • Protected by Advanced Security Systems
              <br />
              <span className="text-gray-700">Unauthorized access is strictly prohibited.</span>
            </p>
          </div>
        </div>
        
        {/* Debug Info (only in development) */}
        {showDebug && (
          <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Debug Information:</p>
            <pre className="text-xs text-gray-600">
              {JSON.stringify({ reason, message, remainingMinutes }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
