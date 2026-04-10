/**
 * DuukaAfrica Payment Split Logic
 * 
 * Handles payment provider split payments with the following distribution:
 * 
 * BUYER PAYS:
 * - Product Price (in seller's currency, converted to buyer's currency)
 * - Shipping Fee (includes hidden 5% markup)
 * - Total = Product + Shipping
 * 
 * DISTRIBUTION:
 * - Seller receives: (Product Price - Commission) + (Shipping Fee - Platform Markup)
 * - Platform receives: Commission (5-10% of product) + Shipping Markup (5%)
 * 
 * The seller uses their shipping portion to pay bus companies directly.
 * Platform earnings can be withdrawn by admin via configured payout method.
 */

import { Country, Currency, CURRENCY_INFO, MOBILE_MONEY_PROVIDERS } from '@/lib/currency';
import { calculateShippingFee, getConversionRate } from './shipping-calculator';
import { prisma } from '@/lib/db';

// ============================================
// INTERFACES
// ============================================

export interface PaymentBreakdownInput {
  // Product details
  productPrice: number;         // Price in seller's currency
  sellerCurrency: Currency;
  sellerCountry: Country;
  sellerCommissionRate: number; // e.g., 10 for 10%
  
  // Buyer details
  buyerCurrency: Currency;
  buyerCountry: Country;
  
  // Shipping
  productWeightKg: number;
}

export interface PaymentBreakdown {
  // What buyer sees and pays
  buyerDisplayCurrency: Currency;
  productPriceInBuyerCurrency: number;
  shippingFeeInBuyerCurrency: number;
  totalBuyerPays: number;
  
  // Original amounts (seller's currency)
  originalProductPrice: number;
  originalShippingFee: number;
  originalCurrency: Currency;
  
  // Platform earnings
  platformProductCommission: number;   // Commission from product (e.g., 10%)
  platformShippingMarkup: number;      // Hidden markup from shipping (e.g., 5%)
  platformTotalEarnings: number;
  
  // Seller earnings
  sellerProductEarnings: number;       // Product price minus commission
  sellerShippingEarnings: number;      // Shipping fee minus markup
  sellerTotalEarnings: number;
  
  // Zone info
  shippingZoneType: string;
  estimatedDeliveryDays: string;
}

// ============================================
// MAIN PAYMENT BREAKDOWN CALCULATOR
// ============================================

export async function calculatePaymentBreakdown(
  input: PaymentBreakdownInput
): Promise<PaymentBreakdown> {
  const {
    productPrice,
    sellerCurrency,
    sellerCountry,
    sellerCommissionRate,
    buyerCurrency,
    buyerCountry,
    productWeightKg,
  } = input;

  // 1. Calculate shipping fee
  const shippingResult = await calculateShippingFee({
    sellerCountry,
    buyerCountry,
    weightKg: productWeightKg,
    sellerCurrency,
    buyerCurrency,
  });

  // 2. Calculate platform commission on product
  const platformProductCommission = Math.round(
    productPrice * (sellerCommissionRate / 100)
  );

  // 3. Seller earns product price minus commission
  const sellerProductEarnings = productPrice - platformProductCommission;

  // 4. Platform markup from shipping (already calculated in shipping calculator)
  const platformShippingMarkup = shippingResult.platformMarkup;

  // 5. Seller receives shipping amount minus markup
  const sellerShippingEarnings = shippingResult.sellerShippingAmount;

  // 6. Convert product price to buyer's currency
  const conversionRate = getConversionRate(sellerCurrency, buyerCurrency);
  const productPriceInBuyerCurrency = Math.round(productPrice * conversionRate);

  // 7. Total platform earnings
  const platformTotalEarnings = platformProductCommission + platformShippingMarkup;

  // 8. Total seller earnings
  const sellerTotalEarnings = sellerProductEarnings + sellerShippingEarnings;

  // 9. Total buyer pays
  const totalBuyerPays = productPriceInBuyerCurrency + shippingResult.buyerShippingFee;

  // 10. Estimated delivery
  const { getEstimatedDeliveryDays } = await import('./shipping-calculator');
  const deliveryEstimate = getEstimatedDeliveryDays(shippingResult.zoneType);

  return {
    // Buyer display
    buyerDisplayCurrency: buyerCurrency,
    productPriceInBuyerCurrency,
    shippingFeeInBuyerCurrency: shippingResult.buyerShippingFee,
    totalBuyerPays,
    
    // Original amounts
    originalProductPrice: productPrice,
    originalShippingFee: shippingResult.totalShippingFee,
    originalCurrency: sellerCurrency,
    
    // Platform earnings
    platformProductCommission,
    platformShippingMarkup,
    platformTotalEarnings,
    
    // Seller earnings
    sellerProductEarnings,
    sellerShippingEarnings,
    sellerTotalEarnings,
    
    // Zone info
    shippingZoneType: shippingResult.zoneType,
    estimatedDeliveryDays: deliveryEstimate.description,
  };
}

// ============================================
// SELLER WITHDRAWAL LOGIC
// ============================================

export interface SellerWithdrawalInput {
  storeId: string;
  amount: number;
  currency: Currency;
  payoutMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  payoutPhone?: string;
  payoutBankName?: string;
  payoutBankAccount?: string;
}

export interface SellerWithdrawalResult {
  success: boolean;
  reference?: string;
  error?: string;
}

/**
 * Validate seller withdrawal request
 */
export function validateWithdrawalRequest(
  availableBalance: number,
  requestedAmount: number,
  payoutMethod: string,
  payoutPhone?: string,
  payoutBankName?: string,
  payoutBankAccount?: string
): { valid: boolean; error?: string } {
  // Check sufficient balance
  if (requestedAmount > availableBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Available: ${availableBalance}, Requested: ${requestedAmount}`,
    };
  }

  // Check minimum withdrawal amount
  if (requestedAmount < 1000) { // Minimum UGX 1,000 or equivalent
    return {
      valid: false,
      error: 'Minimum withdrawal amount is 1,000',
    };
  }

  // Validate payout method details
  if (payoutMethod === 'MOBILE_MONEY' && !payoutPhone) {
    return {
      valid: false,
      error: 'Mobile money number is required for mobile money payouts',
    };
  }

  if (payoutMethod === 'BANK_TRANSFER') {
    if (!payoutBankName || !payoutBankAccount) {
      return {
        valid: false,
        error: 'Bank name and account number are required for bank transfers',
      };
    }
  }

  return { valid: true };
}

// ============================================
// PLATFORM ADMIN WITHDRAWAL
// ============================================

export interface PlatformWithdrawalInput {
  amount: number;
  currency: Currency;
  payoutMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  payoutPhone?: string;
  payoutBankName?: string;
  payoutBankAccount?: string;
}

/**
 * Calculate total platform earnings from actual database records
 * Aggregates commission and shipping markup from all orders
 */
export async function getPlatformEarnings(): Promise<{
  totalCommission: number;
  totalShippingMarkup: number;
  totalEarnings: number;
  availableForWithdrawal: number;
  pendingSettlement: number;
}> {
  try {
    // Aggregate from all paid orders
    const aggregations = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: {
        platformProductCommission: true,
        platformShippingMarkup: true,
      },
    });

    const totalCommission = aggregations._sum.platformProductCommission?.toNumber?.() ?? 0;
    const totalShippingMarkup = aggregations._sum.platformShippingMarkup?.toNumber?.() ?? 0;
    const totalEarnings = totalCommission + totalShippingMarkup;

    // Calculate pending settlement (escrow funds not yet released)
    const escrowHeld = await prisma.escrowTransaction.aggregate({
      where: { status: 'HELD' },
      _sum: {
        sellerAmount: true,
        platformAmount: true,
      },
    });

    const pendingSettlement = escrowHeld._sum.platformAmount?.toNumber?.() ?? 0;

    // Available = total earned minus what's held in escrow
    const availableForWithdrawal = Math.max(0, totalEarnings - pendingSettlement);

    return {
      totalCommission,
      totalShippingMarkup,
      totalEarnings,
      availableForWithdrawal,
      pendingSettlement,
    };
  } catch (error) {
    console.error('Error calculating platform earnings:', error);
    // Return zeros on error rather than crashing
    return {
      totalCommission: 0,
      totalShippingMarkup: 0,
      totalEarnings: 0,
      availableForWithdrawal: 0,
      pendingSettlement: 0,
    };
  }
}

// ============================================
// CURRENCY DISPLAY HELPERS
// Use centralized CURRENCY_INFO from @/lib/currency
// ============================================

export function formatCurrency(
  amount: number,
  currency: Currency
): string {
  const info = CURRENCY_INFO[currency];
  return `${info.symbol} ${amount.toLocaleString()}`;
}

export function getCurrencyName(currency: Currency): string {
  return CURRENCY_INFO[currency].name;
}

export function getMobileMoneyMethods(country: Country): Array<{
  name: string;
  code: string;
}> {
  const providers = MOBILE_MONEY_PROVIDERS[country] || [];
  return providers.map(p => ({ name: p.name, code: p.paymentCode }));
}
