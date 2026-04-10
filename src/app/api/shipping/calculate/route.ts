/**
 * API: Calculate Shipping Fee
 * 
 * POST /api/shipping/calculate
 * 
 * Calculates shipping fee based on seller country, buyer country, and product weight
 */

import { NextRequest, NextResponse } from 'next/server';
import { Country, Currency, COUNTRY_INFO } from '@/lib/currency';
import {
  calculateShippingFee,
  canShipToCountry,
  formatShippingFee,
  getEstimatedDeliveryDays,
} from '@/lib/shipping-calculator';

// Derive valid countries from the canonical COUNTRY_INFO (single source of truth)
const validCountries = Object.keys(COUNTRY_INFO) as Country[];

// Build a lookup map: any common variant → canonical Country
// e.g. "uganda" → "UGANDA", "UG" → "UGANDA", "Uganda" → "UGANDA"
const countryAliases: Record<string, Country> = {};
for (const c of validCountries) {
  countryAliases[c.toLowerCase()] = c;
  countryAliases[c] = c;
}

/**
 * Normalize a raw country value to a canonical Country code.
 * Handles: uppercase, lowercase, mixed case, common 2-letter codes.
 * Returns null if unrecognised.
 */
function normalizeCountry(raw: unknown): Country | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Direct match first (fast path)
  if (countryAliases[trimmed]) return countryAliases[trimmed];
  // Try lowercase
  const lower = trimmed.toLowerCase();
  if (countryAliases[lower]) return countryAliases[lower];
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const {
      sellerCountry: rawSeller,
      buyerCountry: rawBuyer,
      weightKg,
      sellerCurrency = 'UGX',
      buyerCurrency = 'UGX',
      shipsToCountries = null,
      localShippingOnly = false,
    } = body;

    // Normalize countries
    const sellerCountry = normalizeCountry(rawSeller);
    const buyerCountry = normalizeCountry(rawBuyer);

    // Debug logging — helps trace issues in Vercel logs
    console.log('[shipping-api] Received:', JSON.stringify({
      rawSeller, rawBuyer, sellerCountry, buyerCountry, weightKg
    }));

    // Validate required fields
    if (!sellerCountry || !buyerCountry || weightKg === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing or invalid fields. sellerCountry=${JSON.stringify(rawSeller)}, buyerCountry=${JSON.stringify(rawBuyer)}, weightKg=${weightKg}. Expected countries: ${validCountries.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check if shipping is possible
    const canShip = canShipToCountry(
      sellerCountry,
      buyerCountry,
      shipsToCountries,
      localShippingOnly
    );

    if (!canShip) {
      return NextResponse.json(
        {
          success: false,
          error: 'This product is not available for shipping to your country',
          canShip: false,
        },
        { status: 200 }
      );
    }

    // Calculate shipping
    const result = await calculateShippingFee({
      sellerCountry,
      buyerCountry,
      weightKg: parseFloat(weightKg),
      sellerCurrency: (sellerCurrency || 'UGX') as Currency,
      buyerCurrency: (buyerCurrency || 'UGX') as Currency,
    });

    // Get estimated delivery
    const deliveryEstimate = getEstimatedDeliveryDays(result.zoneType);

    return NextResponse.json({
      success: true,
      canShip: true,
      shipping: {
        zoneType: result.zoneType,
        fee: result.buyerShippingFee,
        feeFormatted: formatShippingFee(result.buyerShippingFee, result.buyerCurrency),
        currency: result.buyerCurrency,
        estimatedDays: deliveryEstimate.description,
        minDays: deliveryEstimate.min,
        maxDays: deliveryEstimate.max,
      },
      breakdown: {
        baseFee: result.baseFee,
        weightFee: result.weightFee,
        crossBorderFee: result.crossBorderFee,
        total: result.totalShippingFee,
      },
    });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate shipping fee',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const sellerCountry = searchParams.get('sellerCountry');
  const buyerCountry = searchParams.get('buyerCountry');
  const weightKg = searchParams.get('weightKg');
  const sellerCurrency = searchParams.get('sellerCurrency') || 'UGX';
  const buyerCurrency = searchParams.get('buyerCurrency') || 'UGX';

  if (!sellerCountry || !buyerCountry || !weightKg) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required query params: sellerCountry, buyerCountry, weightKg',
      },
      { status: 400 }
    );
  }

  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      sellerCountry,
      buyerCountry,
      weightKg: parseFloat(weightKg),
      sellerCurrency,
      buyerCurrency,
    }),
    headers: { 'Content-Type': 'application/json' },
  }));
}
