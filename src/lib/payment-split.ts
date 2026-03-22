/**
 * DuukaAfrica Payment Split Logic
 * 
 * Handles Flutterwave split payments with the following distribution:
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

import { Country, Currency } from '@/lib/currency';
import { calculateShippingFee, getConversionRate } from './shipping-calculator';

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
  
  // Flutterwave subaccount
  sellerSubaccountId?: string | null;
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
  
  // For Flutterwave split
  sellerSubaccountId?: string;
  
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
    sellerSubaccountId,
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
    
    // Flutterwave subaccount
    sellerSubaccountId: sellerSubaccountId || undefined,
    
    // Zone info
    shippingZoneType: shippingResult.zoneType,
    estimatedDeliveryDays: deliveryEstimate.description,
  };
}

// ============================================
// FLUTTERWAVE SPLIT PAYMENT CONFIGURATION
// ============================================

export interface FlutterwaveSplitConfig {
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    phone_number?: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  subaccounts?: Array<{
    id: string;
    transaction_charge_type?: string;  // 'flat' or 'percentage'
    transaction_charge?: number;
  }>;
  meta?: Record<string, string | number>;
}

/**
 * Generate Flutterwave payment configuration with split payments
 */
export function generateFlutterwaveSplitConfig(
  breakdown: PaymentBreakdown,
  orderDetails: {
    orderId: string;
    orderNumber: string;
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    platformName?: string;
  }
): FlutterwaveSplitConfig {
  const config: FlutterwaveSplitConfig = {
    tx_ref: `DUKA_${orderDetails.orderNumber}_${Date.now()}`,
    amount: breakdown.totalBuyerPays,
    currency: breakdown.buyerDisplayCurrency,
    customer: {
      email: orderDetails.customerEmail,
      phone_number: orderDetails.customerPhone,
      name: orderDetails.customerName,
    },
    customizations: {
      title: orderDetails.platformName || 'DuukaAfrica',
      description: `Order ${orderDetails.orderNumber}`,
    },
    meta: {
      order_id: orderDetails.orderId,
      order_number: orderDetails.orderNumber,
      platform_commission: breakdown.platformProductCommission,
      platform_shipping_markup: breakdown.platformShippingMarkup,
      seller_earnings: breakdown.sellerTotalEarnings,
    },
  };

  // Add subaccount for seller if configured
  // Note: Flutterwave requires sellers to have subaccounts set up
  // The split happens automatically based on subaccount configuration
  if (breakdown.sellerSubaccountId) {
    config.subaccounts = [
      {
        id: breakdown.sellerSubaccountId,
        // Seller receives their total earnings
        // Platform keeps the rest (commission + shipping markup)
        transaction_charge_type: 'flat',
        transaction_charge: breakdown.sellerTotalEarnings,
      },
    ];
  }

  return config;
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
 * Calculate total platform earnings
 */
export async function getPlatformEarnings(): Promise<{
  totalCommission: number;
  totalShippingMarkup: number;
  totalEarnings: number;
  availableForWithdrawal: number;
  pendingSettlement: number;
}> {
  // This would query the database for actual earnings
  // For now, return placeholder
  // TODO: Implement actual database queries
  
  return {
    totalCommission: 0,
    totalShippingMarkup: 0,
    totalEarnings: 0,
    availableForWithdrawal: 0,
    pendingSettlement: 0,
  };
}

// ============================================
// CURRENCY DISPLAY HELPERS
// ============================================

const CURRENCY_SYMBOLS: Record<Currency, { symbol: string; name: string }> = {
  UGX: { symbol: 'UGX', name: 'Ugandan Shilling' },
  KES: { symbol: 'KES', name: 'Kenyan Shilling' },
  TZS: { symbol: 'TZS', name: 'Tanzanian Shilling' },
  RWF: { symbol: 'RWF', name: 'Rwandan Franc' },
};

export function formatCurrency(
  amount: number,
  currency: Currency
): string {
  const { symbol } = CURRENCY_SYMBOLS[currency];
  return `${symbol} ${amount.toLocaleString()}`;
}

export function getCurrencyName(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency].name;
}

export function getMobileMoneyMethods(country: Country): Array<{
  name: string;
  code: string;
}> {
  const methods: Record<Country, Array<{ name: string; code: string }>> = {
    UGANDA: [
      { name: 'MTN Mobile Money', code: 'MTN_MONEY_UG' },
      { name: 'Airtel Money', code: 'AIRTEL_MONEY_UG' },
    ],
    KENYA: [
      { name: 'M-Pesa', code: 'MPESA' },
      { name: 'Airtel Money', code: 'AIRTEL_MONEY_KE' },
    ],
    TANZANIA: [
      { name: 'M-Pesa', code: 'MPESA_TZ' },
      { name: 'Airtel Money', code: 'AIRTEL_MONEY_TZ' },
      { name: 'Tigo Pesa', code: 'TIGO_PESA' },
    ],
    RWANDA: [
      { name: 'MTN Mobile Money', code: 'MTN_MONEY_RW' },
      { name: 'Airtel Money', code: 'AIRTEL_MONEY_RW' },
    ],
  };

  return methods[country] || [];
}
