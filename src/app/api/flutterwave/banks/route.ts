/**
 * API: Get Banks from Flutterwave
 * 
 * GET /api/flutterwave/banks?country=UG
 * 
 * Returns list of banks for a given country code
 */

import { NextRequest, NextResponse } from 'next/server'
import { flutterwaveClient } from '@/lib/flutterwave/client'

// Map our country names to Flutterwave country codes
const COUNTRY_TO_FW: Record<string, string> = {
  UGANDA: 'UG',
  KENYA: 'KE',
  TANZANIA: 'TZ',
  RWANDA: 'RW'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || 'UGANDA'
    
    const fwCountry = COUNTRY_TO_FW[country] || 'UG'
    
    const response = await flutterwaveClient.getBanks(fwCountry)
    
    if (response.status === 'success') {
      return NextResponse.json({
        success: true,
        banks: response.data.map((bank: any) => ({
          code: bank.code,
          name: bank.name,
          id: bank.id
        }))
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    )
  }
}
