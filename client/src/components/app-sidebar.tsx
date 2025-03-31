"use client";

import {
  Calendar,
  CreditCard,
  Home,
  Inbox,
  LogOut,
  Search,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCard,
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: Inbox,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: Calendar,
  },
  {
    title: "Clips",
    url: "/clips",
    icon: Search,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  } = useSidebar();

  return (
    <Sidebar variant="floating" className="bg-gray-900">
      <SidebarContent className="bg-gray-900 text-white rounded-t-lg">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white text-2xl font-bold p-8 mb-10 text-center justify-center flex flex-col mt-3 gap-3 ">
            <Image src="/logo.png" alt="Clipmore Logo" width={32} height={32} />
            Clipmore
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-gray-900 rounded-b-lg">
        <SignOutButton redirectUrl="/sign-in" signOutOptions={{ redirectUrl: "/sign-in" }}>
          <Button className="text-white mt-2 ml-2 hover:cursor-pointer z-50 bg-gray-800" onClick={() => {
            setOpen(false);
            setOpenMobile(false);
          }}>
            <LogOut />
          </Button>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
