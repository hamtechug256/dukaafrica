import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  CheckCircle, XCircle, AlertTriangle, Package, Truck, 
  DollarSign, Users, Shield, Clock, Star, FileText,
  MessageSquare, Ban, ThumbsUp, ThumbsDown
} from 'lucide-react'

export default function SellerGuidelinesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-r from-orange-500 to-green-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold">Seller Guidelines</h1>
            <p className="mt-2 text-white/80">Everything you need to know about selling on DuukaAfrica</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Do's</h3>
                    <p className="text-sm text-gray-500">Best practices for sellers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Don'ts</h3>
                    <p className="text-sm text-gray-500">Things to avoid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Violations</h3>
                    <p className="text-sm text-gray-500">Prohibited activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Product Listing Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Product Listing Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <ThumbsUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Do:</p>
                        <ul className="text-sm text-green-700 mt-1 space-y-1">
                          <li>• Use clear, high-quality product images</li>
                          <li>• Write accurate and detailed descriptions</li>
                          <li>• Set competitive and fair prices</li>
                          <li>• Keep inventory updated regularly</li>
                          <li>• Respond to customer questions within 24 hours</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <ThumbsDown className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Don't:</p>
                        <ul className="text-sm text-red-700 mt-1 space-y-1">
                          <li>• Use stock images that don't represent the actual product</li>
                          <li>• Misrepresent product condition or features</li>
                          <li>• List counterfeit or replica items</li>
                          <li>• Use misleading pricing strategies</li>
                          <li>• Copy descriptions from other sellers</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Fulfillment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Order Fulfillment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Processing Time</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Orders should be processed and shipped within 1-3 business days. 
                        Update order status promptly.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Packaging</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Use appropriate packaging to prevent damage. Include invoice 
                        and return instructions.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Delivery Targets:</strong> Kampala (1-2 days), Major towns (2-4 days), 
                      Rural areas (4-7 days)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Pricing & Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Commission Rate</span>
                      <Badge variant="secondary">5-15% depending on category</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Payment Schedule</span>
                      <Badge variant="secondary">Within 48 hours after delivery</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Minimum Payout</span>
                      <Badge variant="secondary">UGX 50,000</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Customer Service Standards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Response Times</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Messages: Within 24 hours</li>
                        <li>• Order issues: Within 12 hours</li>
                        <li>• Returns/Refunds: Within 48 hours</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Communication Tips</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Be professional and courteous</li>
                        <li>• Provide clear information</li>
                        <li>• Resolve issues promptly</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prohibited Activities */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Ban className="w-5 h-5" />
                    Prohibited Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Selling counterfeit goods
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Price manipulation
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Fake reviews or ratings
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Taking transactions off-platform
                      </li>
                    </ul>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Selling prohibited items
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Misleading product information
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Order manipulation
                      </li>
                      <li className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Harassment of buyers
                      </li>
                    </ul>
                  </div>
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> Violations may result in account suspension, 
                      listing removal, or permanent ban from the platform.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/seller/register">Start Selling</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/seller/fees">View Fee Structure</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/seller/resources">Seller Resources</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Order Cancellation Rate</span>
                    <Badge variant="destructive">&lt; 5%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Late Shipment Rate</span>
                    <Badge variant="destructive">&lt; 3%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <Badge variant="secondary">&lt; 24 hours</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Minimum Rating</span>
                    <Badge className="bg-yellow-500">4.0+ stars</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-gray-600">
                    Our seller support team is here to help you succeed.
                  </p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">Seller Support</p>
                    <p className="text-gray-500">sellers@duukaafrica.com</p>
                    <p className="text-gray-500">+256 700 123 456</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
