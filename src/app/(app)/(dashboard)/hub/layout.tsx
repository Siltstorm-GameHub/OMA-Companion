import HubSectionNav from "@/components/hub/HubSectionNav";

/**
 * OMA Hub: alles rund um Old Masters Allies an einem Ort — Spendenpool, Fanshop,
 * Downloads (digitale Assets) und das Wallpaper-Studio.
 */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-0 pb-8 sm:py-8">
      <HubSectionNav />
      {children}
    </div>
  );
}
