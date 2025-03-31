"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useUser();
  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (isSignedIn) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8">
      <SignIn
            routing="hash"
            appearance={{
              elements: {
                footerAction: "hidden",
                alternativeMethodsBlockButton: "text-[white]",
              },
              variables: {
                colorBackground: "#1a202c",
                colorPrimary: "rgba(86,105,255,1)",
                colorText: "white",
                colorTextSecondary: "white",
                colorTextOnPrimaryBackground: "white",
                colorInputBackground: "white",
              },
            }}
          />
      </div>
    </div>
  );
}
