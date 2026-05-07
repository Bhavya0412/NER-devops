import { useNavigate } from "react-router-dom";

import { SignInPage } from "@/components/ui/sign-in-flow-1";
import type { User } from "@/lib/api";

export default function Login({ onAuth }: { onAuth: (user: User) => void }) {
  const navigate = useNavigate();

  return (
    <SignInPage
      onCreateAccount={(email) => navigate(`/create-account?email=${encodeURIComponent(email)}`)}
      onAuth={(user) => {
        onAuth(user);
      }}
      onDone={() => navigate("/")}
    />
  );
}
