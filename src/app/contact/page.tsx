import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  MessageCircle,
} from 'lucide-react'
import ContactForm from '@/components/contact/contact-form'

export const metadata: Metadata = {
  title: 'Contact Us - DuukaAfrica',
  description: 'Get in touch with DuukaAfrica. We are here to help you with any questions about orders, products, or seller accounts.',
  openGraph: {
    title: 'Contact Us - DuukaAfrica',
    description: 'Get in touch with DuukaAfrica. We are here to help you with any questions about orders, products, or seller accounts.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us - DuukaAfrica',
    description: 'Get in touch with DuukaAfrica. We are here to help you with any questions about orders, products, or seller accounts.',
  },
  alternates: {
    canonical: 'https://duukaafrica.com/contact',
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      For general inquiries
                    </p>
                    <a href="mailto:support@duukaafrica.com" className="text-primary hover:underline">
                      support@duukaafrica.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      Mon-Fri, 8am-6pm EAT
                    </p>
                    <a href="tel:+256700123456" className="text-primary hover:underline">
                      +256 700 123 456
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Office</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      Kampala, Uganda
                    </p>
                    <p className="text-gray-500 text-sm">
                      Kampala Road, Plot 123
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Business Hours</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      Monday - Friday: 8am - 6pm<br />
                      Saturday: 9am - 4pm<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Live Chat</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      Chat with our support team
                    </p>
                    <Button variant="link" className="p-0 h-auto text-primary">
                      Start Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Send us a Message
                </h2>
                <ContactForm />
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
