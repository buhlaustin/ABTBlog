import { MarketingAmbient } from "@/components/marketing-ambient";
import { MobileBottomBar } from "@/components/mobile-bottom-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingAmbient />
      <SiteHeader />
      <div className="main-with-mobile-bar flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <MobileBottomBar />
    </>
  );
}
