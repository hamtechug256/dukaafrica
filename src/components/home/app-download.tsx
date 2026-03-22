import { Smartphone, Mail } from "lucide-react";

export function AppDownload() {
  return (
    <section className="py-12 bg-white">
      <div className="container">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Content */}
            <div className="p-8 lg:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Shop Anywhere, Anytime
              </h2>
              <p className="text-gray-300 text-lg mb-6">
                Download the DuukaAfrica app for the best shopping experience. Get exclusive deals, track orders in real-time, and shop on the go!
              </p>
              
              {/* Features */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Exclusive app-only discounts up to 50% off</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Real-time order tracking with notifications</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Faster checkout with saved preferences</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Instant customer support via chat</span>
                </li>
              </ul>

              {/* App Store Buttons */}
              <div className="flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-gray-500">Download on the</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </a>
                <a href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs text-gray-500">GET IT ON</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="hidden lg:flex justify-center items-end py-8 pr-8">
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-64 h-[520px] bg-gray-800 rounded-[40px] p-2 shadow-2xl border-4 border-gray-700">
                  <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                    {/* App Screenshot */}
                    <div className="w-full h-full bg-gradient-to-b from-primary to-emerald-600 flex flex-col items-center justify-center text-white">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4">
                        <span className="text-primary font-bold text-2xl">D</span>
                      </div>
                      <div className="text-xl font-bold">DuukaAfrica</div>
                      <div className="text-sm opacity-80 mt-1">Your Shop, Your Way</div>
                      <div className="mt-8 bg-white/20 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/30"></div>
                          <div className="flex-1">
                            <div className="h-2 w-24 bg-white/30 rounded mb-1"></div>
                            <div className="h-2 w-16 bg-white/30 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-emerald-500 rounded-full opacity-20"></div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
