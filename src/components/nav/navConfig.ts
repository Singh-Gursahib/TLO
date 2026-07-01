import {
  Home,
  UserCheck,
  Footprints,
  ShieldAlert,
  Users,
  Clock,
  Thermometer,
  UsersRound,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Primary destinations — shown in the mobile bottom bar (first 4 + More)
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Attendance", href: "/attendance", icon: UserCheck },
  { label: "Outings", href: "/outings", icon: Footprints },
  { label: "Incidents", href: "/incidents", icon: ShieldAlert },
];

// Everything under "More" / lower sidebar
export const secondaryNav: NavItem[] = [
  { label: "Students", href: "/students", icon: Users },
  { label: "Time Clock", href: "/clock", icon: Clock },
  { label: "Temperature", href: "/temperature", icon: Thermometer },
  { label: "Staff", href: "/staff", icon: UsersRound },
];

export const adminNav: NavItem = { label: "Admin", href: "/admin", icon: Shield };
