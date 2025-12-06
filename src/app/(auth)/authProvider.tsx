import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator, Radio, RadioGroupField, useAuthenticator, View, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import AuthErrorGuide from '@/components/AuthErrorGuide';
import { I18n } from 'aws-amplify/utils';

I18n.putVocabularies(translations);
I18n.putVocabularies({
  en: {
    'Sign In': 'Log In',
    'Sign in': 'Log in',
  },
});

// Check if environment variables are set
const userPoolId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID;

if (!userPoolId || !userPoolClientId) {
  console.error('AWS Cognito User Pool configuration is missing. Please set the following environment variables:');
  console.error('NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID');
  console.error('NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID');
} else {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId,
        userPoolClientId: userPoolClientId
      }
    }
  });
}

const component = {
  Header(){
    return (
      <View className="mt-6 mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">HQ</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            Home <span className="text-teal-600">Quest</span>
          </h3>
          <p className="text-gray-600 text-lg">
            Your journey to the perfect home starts here
          </p>
        </div>
      </View>
    )
  },
  SignIn: {
    Footer(){
      const router = useRouter();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button
              variant="link"
              className="text-teal-600 p-0 h-auto font-normal hover:underline"
              onClick={() => router.push('/signup')}
            >
              Sign up
            </Button>
          </p>
        </View>
      );
    },
  },


  
};

const formFields = {
  signIn: {
    username: {
      label: 'Email Address',
      placeholder: 'Enter your email address',
      isRequired: true,
    },
    password: {
      label: 'Password',
      placeholder: 'Enter your password',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      order: 1,
      label: 'Email Address',
      placeholder: 'your.email@example.com',
      isRequired: true,
      labelHidden: false,
    },
    given_name: {
      order: 2,
      label: 'Full Name',
      placeholder: 'Enter your full name',
      isRequired: true,
      labelHidden: false,
    },
    phone_number: {
      order: 3,
      label: 'Phone Number',
      placeholder: '+880 1XXXXXXXXX',
      isRequired: true,
      labelHidden: false,
    },
    password: {
      order: 4,
      label: 'Password',
      placeholder: 'Create a strong password',
      isRequired: true,
      labelHidden: false,
    },
    confirm_password: {
      order: 5,
      label: 'Confirm Password',
      placeholder: 'Re-enter your password',
      isRequired: true,
      labelHidden: false,
    },
  },
};

interface AuthenticatedContentProps {
  children: React.ReactNode;
  isAuthPage: boolean;
  isDashboardPage: boolean;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}

const AuthenticatedContent: React.FC<AuthenticatedContentProps> = ({
  children,
  isAuthPage,
  isDashboardPage,
  pathname,
  router,
}) => {
  const { user } = useAuthenticator((context) => [context.user]);
  const shouldShowFullAuth = isAuthPage;

  useEffect(() => {
    // Only redirect if user is authenticated and on signin page
    if (user && user.userId && isAuthPage) {
      router.push('/');
    }
  }, [user, isAuthPage, router]);

  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  return (
    <div className={shouldShowFullAuth ? "min-h-screen" : "h-full"}>
      <Authenticator
        initialState="signIn"
        components={component}
        formFields={formFields}
        loginMechanisms={['email']}
        socialProviders={[]}
      >
        {(props) => shouldShowFullAuth ? <div></div> : <>{children}</>}
      </Authenticator>
    </div>
  );
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = /^\/signin$/.test(pathname);
  const isDashboardPage =
    pathname.startsWith('/landlords') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/admins');
  
  if (!userPoolId || !userPoolClientId) {
    if (isDashboardPage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold mb-2">
                Authentication Not Configured
              </CardTitle>
              <CardDescription>
                AWS Cognito User Pool is not configured. Please set up the required environment variables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">Required environment variables:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID</li>
                    <li>• NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <>{children}</>;
  }

  return (
    <AuthenticatedContent
      router={router}
      pathname={pathname}
      isAuthPage={isAuthPage}
      isDashboardPage={isDashboardPage}
    >
      {children}
    </AuthenticatedContent>
  );
};

export default Auth;