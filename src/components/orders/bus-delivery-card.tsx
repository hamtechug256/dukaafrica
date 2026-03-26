'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { 
  Bus, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Building2,
  ExternalLink 
} from 'lucide-react'
import { motion } from 'framer-motion'

interface BusDeliveryInfo {
  busCompany?: string | null
  busNumberPlate?: string | null
  conductorPhone?: string | null
  pickupLocation?: string | null
  estimatedArrival?: Date | string | null
}

interface BusDeliveryCardProps {
  deliveryInfo: BusDeliveryInfo
  className?: string
}

export function BusDeliveryCard({ deliveryInfo, className }: BusDeliveryCardProps) {
  const {
    busCompany,
    busNumberPlate,
    conductorPhone,
    pickupLocation,
    estimatedArrival,
  } = deliveryInfo

  const handleCallConductor = () => {
    if (conductorPhone) {
      window.location.href = `tel:${conductorPhone}`
    }
  }

  const formatArrivalTime = (date: Date | string | null | undefined) => {
    if (!date) return 'To be confirmed'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Generate initials for bus company avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        {/* Header with gradient background */}
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bus className="w-5 h-5 text-orange-500" />
            Bus Delivery Details
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your package is being transported by bus
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {/* Bus Company Info */}
          {busCompany && (
            <motion.div 
              className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Avatar className="w-12 h-12 border-2 border-orange-200 dark:border-orange-800">
                <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold">
                  {getInitials(busCompany)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {busCompany}
                  </span>
                </div>
                {busNumberPlate && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">Bus No:</span>
                    <span className="text-sm font-mono font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {busNumberPlate}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Delivery Details Grid */}
          <div className="space-y-4">
            {/* Conductor Phone */}
            {conductorPhone && (
              <motion.div 
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Conductor Contact</p>
                  <a 
                    href={`tel:${conductorPhone}`}
                    className="text-base font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  >
                    {conductorPhone}
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Pickup Location */}
            {pickupLocation && (
              <motion.div 
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pickup Location</p>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {pickupLocation}
                  </p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupLocation)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    View on Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Estimated Arrival */}
            <motion.div 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {formatArrivalTime(estimatedArrival)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Call Conductor Button */}
          {conductorPhone && (
            <motion.div 
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={handleCallConductor}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Conductor
              </Button>
            </motion.div>
          )}

          {/* Info Note */}
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> Please bring a valid ID when picking up your package. 
              Contact the conductor before going to the pickup location.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export type { BusDeliveryInfo }
