import { 
  Truck, 
  Shield, 
  CreditCard, 
  Headphones, 
  BadgeCheck, 
  RefreshCcw 
} from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Get your orders delivered to your doorstep within 24-48 hours in major cities across East Africa.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Shield,
    title: "Buyer Protection",
    description: "Shop with confidence. Your payments are protected until you receive and confirm your order.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Pay safely with Mobile Money (M-Pesa, MTN, Airtel), cards, or bank transfer. All transactions encrypted.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    description: "All sellers are verified and vetted. Buy from trusted vendors with proven track records.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: RefreshCcw,
    title: "Easy Returns",
    description: "Not satisfied? Return products within 7 days for a full refund. No questions asked.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our customer support team is available round the clock via chat, phone, or email.",
    color: "bg-teal-100 text-teal-600",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Shop on DuukaAfrica?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            We're committed to providing the best shopping experience for customers across East Africa.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-60">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8" />
            <div className="text-sm">
              <div className="font-semibold">Secure Checkout</div>
              <div className="text-gray-500">SSL Encrypted</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-8 w-8" />
            <div className="text-sm">
              <div className="font-semibold">Verified Sellers</div>
              <div className="text-gray-500">100% Genuine</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            <div className="text-sm">
              <div className="font-semibold">Safe Payments</div>
              <div className="text-gray-500">Multiple Options</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-8 w-8" />
            <div className="text-sm">
              <div className="font-semibold">Easy Returns</div>
              <div className="text-gray-500">7-Day Policy</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
