'use client'
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignInPage() {
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      redirect("/dashboard");
    }
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8">
        <SignIn
          forceRedirectUrl="/dashboard"
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
