import React from 'react';
import { AlertCircle, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuthErrorGuideProps {
  error?: string;
  onSignInClick?: () => void;
}

const AuthErrorGuide: React.FC<AuthErrorGuideProps> = ({ error, onSignInClick }) => {
  const isEmailExistsError = error?.toLowerCase().includes('already exists') || 
                            error?.toLowerCase().includes('user already exists') ||
                            error?.toLowerCase().includes('username exists') ||
                            error?.toLowerCase().includes('email address already exists') ||
                            error?.toLowerCase().includes('phone number already exists');

  if (!isEmailExistsError) {
    return null;
  }

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 mb-2">Account Already Exists</AlertTitle>
      <AlertDescription className="text-amber-700 mb-4">
        An account with this email address is already registered in our system. 
        This means you may have previously created an account.
      </AlertDescription>
      
      <div className="space-y-3 mt-4">
        <h4 className="font-medium text-amber-800 text-sm">What you can do:</h4>
        
        <div className="space-y-3">
          {/* Option 1: Sign In */}
          <Card className="bg-white border-amber-200">
            <CardContent className="flex items-start gap-3 p-3">
              <Mail className="h-4 w-4 text-teal-600 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-sm mb-1">Try Signing In</CardTitle>
                <CardDescription className="text-xs mb-2">
                  Use your existing email and password to sign in
                </CardDescription>
                {onSignInClick && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onSignInClick}
                    className="text-xs text-teal-600 hover:text-teal-700 p-0 h-auto"
                  >
                    Go to Sign In <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Reset Password */}
          <Card className="bg-white border-amber-200">
            <CardContent className="flex items-start gap-3 p-3">
              <KeyRound className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-sm mb-1">Forgot Your Password?</CardTitle>
                <CardDescription className="text-xs">
                  Click &quot;Forgot Password&quot; on the sign-in page to reset it
                </CardDescription>
              </div>
            </CardContent>
          </Card>

          {/* Option 3: Different Email */}
          <Card className="bg-white border-amber-200">
            <CardContent className="flex items-start gap-3 p-3">
              <Mail className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-sm mb-1">Use a Different Email</CardTitle>
                <CardDescription className="text-xs">
                  If you want to create a new account, use a different email address
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4 bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <CardDescription className="text-blue-700 text-xs flex items-start gap-1">
            <Badge variant="secondary" className="text-xs px-1">💡 Tip</Badge>
            If you&apos;re sure you haven&apos;t registered before, 
            someone else might have used your email address. Contact support if you need assistance.
          </CardDescription>
        </CardContent>
      </Card>
    </Alert>
  );
};

export default AuthErrorGuide;