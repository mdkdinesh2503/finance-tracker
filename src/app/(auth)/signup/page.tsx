import { AuthPageHeader } from "@/components/feature-specific/auth/components/auth-page-header";
import { SignupForm } from "@/components/feature-specific/auth/forms/signup-form";

export default function SignupPage() {
  return (
    <div>
      <AuthPageHeader
        title="Create your account"
        description="A few seconds to start tracking spending and income."
        accent="emerald"
      />

      <div className="mt-7">
        <SignupForm />
      </div>
    </div>
  );
}
