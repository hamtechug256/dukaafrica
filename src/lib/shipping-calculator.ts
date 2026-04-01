/**
 * DuukaAfrica Shipping Fee Calculator
 * 
 * Calculates shipping fees based on:
 * - Seller country
 * - Buyer country  
 * - Product weight
 * - Zone type (Local, Domestic, Regional, Cross-Border)
 * 
 * The shipping fee includes a hidden platform markup (5%)
 * Seller handles actual shipping via bus - no platform coordination needed
 */

import { Country, Currency } from '@/lib/currency';
import { prisma } from './db';
import { Prisma } from '@prisma/client';

// Helper to safely convert Prisma Decimal to number
function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  return 0
}

// Define ShippingZoneType locally since Prisma schema uses string, not enum
export type ShippingZoneType = 'LOCAL' | 'DOMESTIC' | 'REGIONAL' | 'CROSS_BORDER'

// ============================================
// ZONE MATRIX: Which country-to-country is which zone
// Based on East African geography and bus routes
// ============================================

export const ZONE_MATRIX: Record<Country, Record<Country, ShippingZoneType>> = {
  UGANDA: {
    UGANDA: 'LOCAL',      // Same country = Local
    KENYA: 'REGIONAL',    // Neighboring = Regional
    TANZANIA: 'CROSS_BORDER', // Not neighboring = Cross-Border
    RWANDA: 'REGIONAL',   // Neighboring = Regional
  },
  KENYA: {
    UGANDA: 'REGIONAL',
    KENYA: 'LOCAL',
    TANZANIA: 'REGIONAL',
    RWANDA: 'CROSS_BORDER',
  },
  TANZANIA: {
    UGANDA: 'CROSS_BORDER',
    KENYA: 'REGIONAL',
    TANZANIA: 'LOCAL',
    RWANDA: 'CROSS_BORDER',
  },
  RWANDA: {
    UGANDA: 'REGIONAL',
    KENYA: 'CROSS_BORDER',
    TANZANIA: 'CROSS_BORDER',
    RWANDA: 'LOCAL',
  },
};

// ============================================
// DEFAULT SHIPPING RATES (if not configured in DB)
// These are in Ugandan Shilling equivalent
// Admin can override these in the database
// ============================================

export const DEFAULT_SHIPPING_RATES: Record<ShippingZoneType, {
  baseFee: number;
  perKgFee: number;
  crossBorderFee: number;
  platformMarkupPercent: number;
}> = {
  LOCAL: {
    baseFee: 5000,      // UGX 5,000 base fee for local
    perKgFee: 500,      // UGX 500 per kg
    crossBorderFee: 0,  // No cross-border fee
    platformMarkupPercent: 5, // 5% hidden markup
  },
  DOMESTIC: {
    baseFee: 8000,      // UGX 8,000 for domestic (different city)
    perKgFee: 800,      // UGX 800 per kg
    crossBorderFee: 0,
    platformMarkupPercent: 5,
  },
  REGIONAL: {
    baseFee: 15000,     // UGX 15,000 for neighboring country
    perKgFee: 1500,     // UGX 1,500 per kg
    crossBorderFee: 3000, // UGX 3,000 for customs handling
    platformMarkupPercent: 5,
  },
  CROSS_BORDER: {
    baseFee: 25000,     // UGX 25,000 for non-neighboring country
    perKgFee: 2500,     // UGX 2,500 per kg
    crossBorderFee: 5000, // UGX 5,000 for customs handling
    platformMarkupPercent: 5,
  },
};

// ============================================
// CURRENCY CONVERSION RATES (approximate)
// Used for displaying shipping estimates
// Flutterwave handles actual conversion
// ============================================

export const CURRENCY_RATES: Record<Currency, Record<Currency, number>> = {
  UGX: { UGX: 1, KES: 0.035, TZS: 0.27, RWF: 0.26 },
  KES: { UGX: 28.5, KES: 1, TZS: 7.7, RWF: 7.5 },
  TZS: { UGX: 3.7, KES: 0.13, TZS: 1, RWF: 0.97 },
  RWF: { UGX: 3.85, KES: 0.13, TZS: 1.03, RWF: 1 },
};

// ============================================
// WEIGHT TIER DEFINITIONS
// ============================================

export const WEIGHT_TIERS = [
  { name: '0-1kg', minWeight: 0, maxWeight: 1 },
  { name: '1-3kg', minWeight: 1, maxWeight: 3 },
  { name: '3-5kg', minWeight: 3, maxWeight: 5 },
  { name: '5-10kg', minWeight: 5, maxWeight: 10 },
  { name: '10+kg', minWeight: 10, maxWeight: null }, // No max
];

// ============================================
// SHIPPING CALCULATION INTERFACES
// ============================================

export interface ShippingCalculationInput {
  sellerCountry: Country;
  buyerCountry: Country;
  weightKg: number;
  sellerCurrency: Currency;
  buyerCurrency: Currency;
}

export interface ShippingCalculationResult {
  success: boolean;
  zoneType: ShippingZoneType;
  baseFee: number;
  weightFee: number;
  crossBorderFee: number;
  subtotal: number;
  platformMarkup: number;
  totalShippingFee: number;
  sellerShippingAmount: number; // What seller receives for shipping
  displayCurrency: Currency;
  
  // Converted amounts for buyer display
  buyerCurrency: Currency;
  buyerShippingFee: number;
  
  // Errors
  error?: string;
}

// ============================================
// MAIN SHIPPING CALCULATOR
// ============================================

export async function calculateShippingFee(
  input: ShippingCalculationInput
): Promise<ShippingCalculationResult> {
  const { sellerCountry, buyerCountry, weightKg, sellerCurrency, buyerCurrency } = input;

  // 1. Determine the shipping zone
  const zoneType = getShippingZone(sellerCountry, buyerCountry);

  // 2. Get the rates for this zone (from DB or defaults)
  const rates = await getShippingRates(zoneType, sellerCurrency);

  // 3. Calculate the fees
  const baseFee = rates.baseFee;
  const weightFee = Math.ceil(weightKg) * rates.perKgFee; // Round up to next kg
  const crossBorderFee = rates.crossBorderFee;
  
  // Subtotal before markup
  const subtotal = baseFee + weightFee + crossBorderFee;
  
  // Platform markup (hidden - seller doesn't see this breakdown)
  const platformMarkup = Math.round(subtotal * (rates.platformMarkupPercent / 100));
  
  // Total shipping fee buyer pays
  const totalShippingFee = subtotal + platformMarkup;
  
  // What seller receives for shipping (after platform takes markup)
  const sellerShippingAmount = subtotal;

  // 4. Convert to buyer's currency for display
  const conversionRate = getConversionRate(sellerCurrency, buyerCurrency);
  const buyerShippingFee = Math.round(totalShippingFee * conversionRate);

  return {
    success: true,
    zoneType,
    baseFee,
    weightFee,
    crossBorderFee,
    subtotal,
    platformMarkup,
    totalShippingFee,
    sellerShippingAmount,
    displayCurrency: sellerCurrency,
    buyerCurrency,
    buyerShippingFee,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the shipping zone between two countries
 */
export function getShippingZone(
  originCountry: Country,
  destCountry: Country
): ShippingZoneType {
  if (originCountry === destCountry) {
    return 'LOCAL';
  }
  return ZONE_MATRIX[originCountry]?.[destCountry] || 'CROSS_BORDER';
}

/**
 * Get shipping rates for a zone (from DB or defaults)
 */
async function getShippingRates(
  zoneType: ShippingZoneType,
  currency: Currency
): Promise<{
  baseFee: number;
  perKgFee: number;
  crossBorderFee: number;
  platformMarkupPercent: number;
}> {
  try {
    // Try to get from database
    const rates = await prisma.shippingRate.findFirst({
      where: {
        zoneType,
        isActive: true,
      },
      include: {
        ShippingTier: true,
      },
    });

    if (rates) {
      // Convert to requested currency if needed (convert Decimal to number first)
      const conversionRate = getConversionRate(rates.currency as Currency, currency);
      const baseFee = toNum(rates.baseFee);
      const perKgFee = toNum(rates.perKgFee);
      const crossBorderFee = rates.crossBorderFee ? toNum(rates.crossBorderFee) : 0;
      const platformMarkupPercent = toNum(rates.platformMarkupPercent);
      
      return {
        baseFee: Math.round(baseFee * conversionRate),
        perKgFee: Math.round(perKgFee * conversionRate),
        crossBorderFee: Math.round(crossBorderFee * conversionRate),
        platformMarkupPercent,
      };
    }
  } catch (error) {
    console.error('Error fetching shipping rates from DB:', error);
  }

  // Return default rates converted to requested currency
  const defaultRates = DEFAULT_SHIPPING_RATES[zoneType];
  const conversionRate = getConversionRate('UGX', currency);
  
  return {
    baseFee: Math.round(defaultRates.baseFee * conversionRate),
    perKgFee: Math.round(defaultRates.perKgFee * conversionRate),
    crossBorderFee: Math.round(defaultRates.crossBorderFee * conversionRate),
    platformMarkupPercent: defaultRates.platformMarkupPercent,
  };
}

/**
 * Get conversion rate between currencies
 */
export function getConversionRate(
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) return 1;
  return CURRENCY_RATES[fromCurrency]?.[toCurrency] || 1;
}

/**
 * Check if a seller can ship to a buyer's country
 */
export function canShipToCountry(
  sellerCountry: Country,
  buyerCountry: Country,
  shipsToCountries: string | null,
  localShippingOnly: boolean
): boolean {
  // Same country - always allowed
  if (sellerCountry === buyerCountry) return true;

  // Seller only ships locally
  if (localShippingOnly) return false;

  // No restrictions - ships everywhere
  if (!shipsToCountries) return true;

  // Check if buyer's country is in the allowed list
  try {
    const allowedCountries = JSON.parse(shipsToCountries) as string[];
    return allowedCountries.includes(buyerCountry);
  } catch {
    return false;
  }
}

/**
 * Format shipping fee for display
 */
export function formatShippingFee(
  amount: number,
  currency: Currency
): string {
  const symbols: Record<Currency, string> = {
    UGX: 'UGX',
    KES: 'KES',
    TZS: 'TZS',
    RWF: 'RWF',
  };

  return `${symbols[currency]} ${amount.toLocaleString()}`;
}

/**
 * Get estimated delivery time for a zone
 */
export function getEstimatedDeliveryDays(zoneType: ShippingZoneType): {
  min: number;
  max: number;
  description: string;
} {
  const estimates: Record<ShippingZoneType, { min: number; max: number; description: string }> = {
    LOCAL: { min: 1, max: 2, description: '1-2 days (same city/region)' },
    DOMESTIC: { min: 2, max: 4, description: '2-4 days (different city)' },
    REGIONAL: { min: 3, max: 7, description: '3-7 days (neighboring country)' },
    CROSS_BORDER: { min: 5, max: 14, description: '5-14 days (distant country)' },
  };

  return estimates[zoneType];
}
