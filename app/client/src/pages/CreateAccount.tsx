import { useNavigate, useSearchParams } from "react-router-dom";

import { SignInPage } from "@/components/ui/sign-in-flow-1";
import type { User } from "@/lib/api";

export default function CreateAccount({ onAuth }: { onAuth: (user: User) => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") || "";

  return (
    <SignInPage
      mode="signup"
      signupAction="submit"
      showNameField
      initialEmail={email}
      hideWelcomeHeading
      showGoogleButton={false}
      showForgotPasswordLink={false}
      showBackToSignInButton
      successCtaText="Continue to login"
      onBackToSignIn={() => navigate("/login")}
      onDone={() => navigate("/login")}
    />
  );
}
