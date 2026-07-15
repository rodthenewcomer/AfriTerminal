import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Créer un espace" };

export default function RegisterPage() {
  return <AuthForm mode="signup" />;
}
