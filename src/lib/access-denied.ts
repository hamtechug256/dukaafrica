import { NextResponse } from 'next/server'

/**
 * Generate Access Denied HTML response for blocked/suspicious/unauthorized access
 */
export function generateAccessDeniedResponse(
  reason: 'blocked' | 'unauthorized' | 'suspicious',
  remainingMinutes?: number,
): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied - DuukaAfrica Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes ping {
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
  <div class="max-w-lg w-full">
    <!-- Warning Header -->
    <div class="bg-red-500/10 border border-red-500/30 rounded-t-lg p-3 flex items-center justify-center gap-2">
      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
      <span class="text-red-400 text-sm font-medium tracking-wider uppercase">Restricted Access Zone</span>
    </div>
    <!-- Main Card -->
    <div class="bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-b-lg shadow-2xl">
      <div class="p-8 text-center">
        <div class="flex justify-center mb-6">
          <div class="relative">
            <div class="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <div class="relative bg-gray-800 p-6 rounded-full border border-gray-700">
              ${reason === 'blocked' ? '<svg class="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>'
                : reason === 'suspicious' ? '<svg class="w-20 h-20 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
                : '<svg class="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>'
              }
            </div>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">
          ${reason === 'blocked' ? 'Access Permanently Restricted' : reason === 'suspicious' ? 'Suspicious Activity Detected' : 'Access Denied'}
        </h1>
        <p class="text-lg text-gray-400 mb-4">
          ${reason === 'blocked' ? 'Your access has been blocked due to suspicious activity' : reason === 'suspicious' ? 'Your access has been flagged for review' : 'You are not authorized to access this area'}
        </p>
        <p class="text-gray-500 mb-6 leading-relaxed">
          ${reason === 'blocked'
              ? 'Our security systems have detected unusual activity from your connection. This decision is final and cannot be appealed through this interface.'
              : reason === 'suspicious'
              ? 'Our automated security systems have identified potentially malicious behavior from your connection. This incident has been logged.'
              : 'This administrative portal is exclusively for authorized DuukaAfrica administrators. If you believe this is an error, contact the system administrator.'}
        </p>
        ${remainingMinutes ? `
        <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-center gap-2 text-orange-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-mono text-2xl">${remainingMinutes}:00</span>
            <span class="text-sm">minutes remaining</span>
          </div>
        </div>` : ''}
        <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <div class="text-left">
              <p class="text-sm text-gray-400">
                <strong class="text-gray-300">Security Notice:</strong> This incident has been logged and monitored.
                Unauthorized access attempts are recorded and may be reported to relevant authorities.
                All administrative actions require proper authorization.
              </p>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <a href="/" class="block w-full py-2 px-4 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-center">
            <span class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Return to Homepage
            </span>
          </a>
        </div>
      </div>
      <div class="border-t border-gray-800 p-4 bg-gray-900/50">
        <p class="text-xs text-gray-600 text-center">
          DuukaAfrica Administrative Portal - Protected by Advanced Security Systems
          <br>
          <span class="text-gray-700">Unauthorized access is strictly prohibited.</span>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  })
}
