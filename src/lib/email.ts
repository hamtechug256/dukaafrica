// Email Service using Resend (Free 3,000 emails/month)
// API Reference: https://resend.com/docs

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: {
    name: string
    quantity: number
    price: number
    image?: string
  }[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  shippingAddress: {
    name: string
    phone: string
    address: string
    city: string
    country: string
  }
  paymentMethod: string
}

interface SellerOrderEmailData {
  orderNumber: string
  sellerName: string
  sellerEmail: string
  buyerName: string
  buyerPhone: string
  items: {
    name: string
    quantity: number
    price: number
  }[]
  total: number
  currency: string
  deliveryMethod: string
}

// Send email using Resend API
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DuukaAfrica <noreply@duukaafrica.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

// Order confirmation email for buyer
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` : ''}
          <div>
            <p style="margin: 0; font-weight: 600;">${item.name}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">Qty: ${item.quantity} × ${data.currency} ${item.price.toLocaleString()}</p>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
        ${data.currency} ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #059669 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🛒 DuukaAfrica</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Order Confirmed!</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="margin: 0 0 10px; color: #1e293b;">Hi ${data.customerName},</h2>
          <p style="color: #666; margin: 0 0 20px;">
            Thank you for your order! We've received your order <strong>#${data.orderNumber}</strong> and it's being processed.
          </p>

          <!-- Order Details -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #1e293b;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #666;">Subtotal:</span>
                <span>${data.currency} ${data.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #666;">Shipping:</span>
                <span>${data.currency} ${data.shipping.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #1e293b;">
                <span>Total:</span>
                <span>${data.currency} ${data.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Shipping Address -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #1e293b;">📦 Shipping Address</h3>
            <p style="margin: 0; color: #666;">
              ${data.shippingAddress.name}<br>
              ${data.shippingAddress.address}<br>
              ${data.shippingAddress.city}, ${data.shippingAddress.country}<br>
              📞 ${data.shippingAddress.phone}
            </p>
          </div>

          <!-- Payment Method -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <h3 style="margin: 0 0 10px; color: #1e293b;">💳 Payment Method</h3>
            <p style="margin: 0; color: #666;">${data.paymentMethod}</p>
          </div>

          <!-- Tracking Button -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://duukaafrica.com/dashboard/orders" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Track Your Order
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            Questions? Contact us at <a href="mailto:support@duukaafrica.com" style="color: #059669;">support@duukaafrica.com</a>
          </p>
          <p style="margin: 10px 0 0; color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} DuukaAfrica. East Africa's Trusted Marketplace.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: data.customerEmail,
    subject: `Order Confirmed #${data.orderNumber} - DuukaAfrica`,
    html,
  })
}

// New order notification for seller
export async function sendSellerOrderNotification(data: SellerOrderEmailData): Promise<void> {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${data.currency} ${item.price.toLocaleString()}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #059669 100%); padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 You Have a New Order!</h1>
        </div>

        <div style="padding: 25px;">
          <h2 style="margin: 0 0 15px; color: #1e293b;">Order #${data.orderNumber}</h2>
          
          <div style="background: #ecfdf5; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px; color: #059669;">💰 Total Earnings</h3>
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">
              ${data.currency} ${data.total.toLocaleString()}
            </p>
          </div>

          <h3 style="margin: 0 0 10px; color: #1e293b;">📦 Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: #fef3c7; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px; color: #92400e;">📞 Buyer Contact (Important!)</h3>
            <p style="margin: 0; color: #666;">
              <strong>Name:</strong> ${data.buyerName}<br>
              <strong>Phone:</strong> ${data.buyerPhone}
            </p>
            <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">
              ⚠️ Call the buyer to coordinate bus delivery details
            </p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://duukaafrica.com/seller/orders" style="display: inline-block; background: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Order Details
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            DuukaAfrica Seller Portal
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: data.sellerEmail,
    subject: `New Order #${data.orderNumber} - ${data.currency} ${data.total.toLocaleString()}`,
    html,
  })
}

// Order shipped email for buyer
export async function sendOrderShippedEmail(data: {
  orderNumber: string
  customerName: string
  customerEmail: string
  busCompany: string
  busNumberPlate?: string
  conductorPhone?: string
  pickupLocation?: string
}): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Shipped</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚌 Your Order is on the Way!</h1>
        </div>

        <div style="padding: 25px;">
          <h2 style="margin: 0 0 15px; color: #1e293b;">Hi ${data.customerName},</h2>
          <p style="color: #666; margin: 0 0 20px;">
            Great news! Your order <strong>#${data.orderNumber}</strong> has been shipped via bus.
          </p>

          <div style="background: #eef2ff; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px; color: #4f46e5;">🚌 Bus Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Bus Company:</td>
                <td style="padding: 8px 0; font-weight: 600;">${data.busCompany}</td>
              </tr>
              ${data.busNumberPlate ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Number Plate:</td>
                <td style="padding: 8px 0; font-weight: 600;">${data.busNumberPlate}</td>
              </tr>
              ` : ''}
              ${data.conductorPhone ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Conductor Phone:</td>
                <td style="padding: 8px 0; font-weight: 600;">${data.conductorPhone}</td>
              </tr>
              ` : ''}
              ${data.pickupLocation ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Pickup Location:</td>
                <td style="padding: 8px 0; font-weight: 600;">${data.pickupLocation}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #fef3c7; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⚠️ <strong>Important:</strong> Please bring a valid ID when collecting your package at the bus terminal.
            </p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="https://duukaafrica.com/dashboard/orders" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Track Order
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: data.customerEmail,
    subject: `Order Shipped #${data.orderNumber} - Bus: ${data.busCompany}`,
    html,
  })
}

// Welcome email for new users
export async function sendWelcomeEmail(data: { name: string; email: string }): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to DuukaAfrica</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🛒 DuukaAfrica</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0; font-size: 18px;">Welcome to East Africa's #1 Marketplace</p>
        </div>

        <div style="padding: 40px; text-align: center;">
          <h2 style="margin: 0 0 15px; color: #1e293b;">Hello ${data.name}! 👋</h2>
          <p style="color: #666; margin: 0 0 30px; font-size: 16px;">
            Welcome to DuukaAfrica! You're now part of a community of millions of shoppers across East Africa.
          </p>

          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; width: 150px;">
              <div style="font-size: 30px; margin-bottom: 10px;">🇺🇬</div>
              <div style="font-weight: 600; color: #1e293b;">Uganda</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; width: 150px;">
              <div style="font-size: 30px; margin-bottom: 10px;">🇰🇪</div>
              <div style="font-weight: 600; color: #1e293b;">Kenya</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; width: 150px;">
              <div style="font-size: 30px; margin-bottom: 10px;">🇹🇿</div>
              <div style="font-weight: 600; color: #1e293b;">Tanzania</div>
            </div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; width: 150px;">
              <div style="font-size: 30px; margin-bottom: 10px;">🇷🇼</div>
              <div style="font-weight: 600; color: #1e293b;">Rwanda</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 35px;">
            <a href="https://duukaafrica.com/products" style="display: inline-block; background: #059669; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Start Shopping
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            Questions? We're here to help! <a href="mailto:support@duukaafrica.com" style="color: #059669;">support@duukaafrica.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({
    to: data.email,
    subject: 'Welcome to DuukaAfrica! 🎉',
    html,
  })
}
