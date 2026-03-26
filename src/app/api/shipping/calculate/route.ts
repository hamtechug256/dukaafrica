/**
 * API: Calculate Shipping Fee
 * 
 * POST /api/shipping/calculate
 * 
 * Calculates shipping fee based on seller country, buyer country, and product weight
 */

import { NextRequest, NextResponse } from 'next/server';
// Country and Currency are string types in our Prisma schema
type Country = 'UGANDA' | 'KENYA' | 'TANZANIA' | 'RWANDA';
type Currency = 'UGX' | 'KES' | 'TZS' | 'RWF';
import {
  calculateShippingFee,
  canShipToCountry,
  formatShippingFee,
  getEstimatedDeliveryDays,
} from '@/lib/shipping-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const {
      sellerCountry,
      buyerCountry,
      weightKg,
      sellerCurrency = 'UGX',
      buyerCurrency = 'UGX',
      shipsToCountries = null,
      localShippingOnly = false,
    } = body;

    // Validate required fields
    if (!sellerCountry || !buyerCountry || weightKg === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sellerCountry, buyerCountry, weightKg',
        },
        { status: 400 }
      );
    }

    // Validate countries
    const validCountries = ['UGANDA', 'KENYA', 'TANZANIA', 'RWANDA'];
    if (!validCountries.includes(sellerCountry) || !validCountries.includes(buyerCountry)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid country. Must be one of: UGANDA, KENYA, TANZANIA, RWANDA',
        },
        { status: 400 }
      );
    }

    // Check if shipping is possible
    const canShip = canShipToCountry(
      sellerCountry as Country,
      buyerCountry as Country,
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
      sellerCountry: sellerCountry as Country,
      buyerCountry: buyerCountry as Country,
      weightKg: parseFloat(weightKg),
      sellerCurrency: sellerCurrency as Currency,
      buyerCurrency: buyerCurrency as Currency,
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
