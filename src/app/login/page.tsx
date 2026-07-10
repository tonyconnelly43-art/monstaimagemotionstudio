import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { MonstaLogo } from "@/components/monsta-logo";
import { signInAction } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <MonstaLogo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to keep animating the Hoop Squad.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="login" action={signInAction} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
