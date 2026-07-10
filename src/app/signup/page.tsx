import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { MonstaLogo } from "@/components/monsta-logo";
import { signUpAction } from "@/lib/actions/auth";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <MonstaLogo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your studio account</CardTitle>
            <CardDescription>Set up your Hoop Squad creative workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signup" action={signUpAction} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
