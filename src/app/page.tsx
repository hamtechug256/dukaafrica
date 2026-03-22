import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { 
  HeroSection, 
  CategoriesSection, 
  FlashDeals, 
  FeaturedProducts, 
  StoresSection,
  WhyChooseUs,
  AppDownload 
} from "@/components/home-sections";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        <CategoriesSection />
        <FlashDeals />
        <FeaturedProducts />
        <StoresSection />
        <WhyChooseUs />
        <AppDownload />
      </main>
      
      <Footer />
    </div>
  );
}
