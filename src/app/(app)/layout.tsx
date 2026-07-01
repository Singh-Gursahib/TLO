import { AppShell } from "@/components/nav/AppShell";
import { PWARegister } from "@/components/PWARegister";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PWARegister />
      <AppShell>{children}</AppShell>
    </>
  );
}
