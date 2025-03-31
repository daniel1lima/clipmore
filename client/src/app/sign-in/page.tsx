import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
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
