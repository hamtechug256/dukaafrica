'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Cookie, Settings, X } from 'lucide-react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'duukaafrica_cookie_consent'

interface CookiePreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true - cannot be disabled
    functional: true,
    analytics: true,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    saveConsent(allAccepted)
  }

  const acceptNecessary = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    saveConsent(necessaryOnly)
  }

  const savePreferences = () => {
    saveConsent(preferences)
    setShowSettings(false)
  }

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      timestamp: new Date().toISOString(),
      preferences: prefs,
    }))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-4xl mx-auto shadow-2xl border-t-4 border-t-primary">
        {!showSettings ? (
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                    By clicking "Accept All", you consent to our use of cookies.{' '}
                    <Link href="/cookies" className="text-primary hover:underline">
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Customize
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={acceptNecessary}
                >
                  Necessary Only
                </Button>
                <Button 
                  size="sm"
                  onClick={acceptAll}
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Cookie Settings</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowSettings(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled 
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium">Necessary Cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Required for the website to function properly. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={preferences.functional}
                  onChange={(e) => setPreferences({...preferences, functional: e.target.checked})}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium">Functional Cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Remember your preferences like language, region, and login status.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium">Analytics Cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors use our website to improve the experience.
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium">Marketing Cookies</p>
                  <p className="text-sm text-muted-foreground">
                    Track your visit across sites to show relevant advertisements.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button onClick={savePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
