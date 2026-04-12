import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div id="main-content">{children}</div>
      <Footer />
    </>
  )
}
