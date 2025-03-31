import { type Metadata } from "next";
import {
  ClerkProvider,
  SignIn,
  SignInButton,
  SignOutButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clipmore Admin Dashboard",
  description: "Clipmore Admin Dashboard",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}>
          <SidebarProvider defaultOpen={false}>
              <AppSidebar />
              <main className="flex-1 overflow-auto bg-gray-900">
                {children}
              </main>
          </SidebarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
