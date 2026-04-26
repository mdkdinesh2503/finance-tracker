import { AuthShell } from "@/components/feature-specific/auth/components/auth-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
