"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft, Check, User, Home, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signUp, confirmSignUp, signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

interface FormData {
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: 'tenant' | 'landlord' | '';
  gender: 'male' | 'female' | '';
}

interface FormErrors {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  gender?: string;
}

// Configure Amplify
const userPoolId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID;

if (userPoolId && userPoolClientId) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId,
        userPoolClientId: userPoolClientId
      }
    }
  });
}

export default function SignUpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [cognitoUsername, setCognitoUsername] = useState('');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: '',
    gender: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Check if AWS Cognito is configured
  if (!userPoolId || !userPoolClientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold mb-2 text-red-600">
              Configuration Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-4">
              AWS Cognito authentication is not properly configured.
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="w-full bg-teal-500 hover:bg-teal-600"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateStep1 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{10,14}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Generate a non-email username for Cognito (email will be used as alias)
      const username = `hq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setCognitoUsername(username); // Store for verification
      
      // Sign up with AWS Cognito
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: username,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            name: formData.fullName,
            phone_number: formData.phoneNumber.startsWith('+') 
              ? formData.phoneNumber 
              : `+88${formData.phoneNumber}`,
            'custom:role': formData.role,
            'custom:gender': formData.gender,
          }
        }
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setShowVerification(true);
        setCurrentStep(3); // Move to verification step
      } else if (isSignUpComplete) {
        // Account created and verified immediately - get actual user ID and create profile
        try {
          // Sign in to get the user session and actual user ID
          const { isSignedIn } = await signIn({
            username: cognitoUsername,
            password: formData.password
          });

          if (isSignedIn) {
            // Get current user to get the real Cognito User ID
            const currentUser = await getCurrentUser();
            console.log('Current user after immediate signup:', currentUser);
            
            // Create user profile with actual Cognito User ID
            await createUserProfile(currentUser.userId);
            
            // Sign out after creating profile
            await signOut();
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
        }
        
        router.push('/signin?message=Account created successfully! Please sign in.');
      }

    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.name === 'UsernameExistsException') {
        setErrors({ email: 'An account with this email already exists' });
        setCurrentStep(1); // Go back to step 1
      } else if (error.name === 'InvalidPasswordException') {
        setErrors({ password: 'Password does not meet requirements' });
        setCurrentStep(1);
      } else {
        setErrors({ email: error.message || 'Failed to create account. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setErrors({ email: 'Please enter verification code' });
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      const { isSignUpComplete, nextStep, userId } = await confirmSignUp({
        username: cognitoUsername,
        confirmationCode: verificationCode
      });

      if (isSignUpComplete) {
        // Get the actual Cognito User ID after verification
        try {
          // Sign in to get the user session and actual user ID
          const { isSignedIn, nextStep } = await signIn({
            username: cognitoUsername,
            password: formData.password
          });

          if (isSignedIn) {
            // Get current user to get the real Cognito User ID
            const currentUser = await getCurrentUser();
            console.log('Current user after verification:', currentUser);
            
            // Create user profile with actual Cognito User ID
            await createUserProfile(currentUser.userId);
            
            // Sign out after creating profile
            await signOut();
            
            router.push('/signin?message=Account verified successfully! Please sign in.');
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
          // Even if profile creation fails, verification succeeded
          router.push('/signin?message=Account verified successfully! Please sign in and complete your profile.');
        }
      }

    } catch (error: any) {
      console.error('Verification error:', error);
      setErrors({ email: error.message || 'Invalid verification code. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // Resend confirmation code using the same username
      const { isSignUpComplete, nextStep } = await signUp({
        username: cognitoUsername,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            name: formData.fullName,
            phone_number: formData.phoneNumber.startsWith('+') 
              ? formData.phoneNumber 
              : `+88${formData.phoneNumber}`,
            'custom:role': formData.role,
            'custom:gender': formData.gender,
          }
        }
      });
      
      // Show success message
      setErrors({ email: 'Verification code resent successfully!' });
      setTimeout(() => setErrors({}), 3000);
    } catch (error: any) {
      console.error('Resend code error:', error);
      setErrors({ email: 'Failed to resend code. Please try again.' });
    }
  };

  const createUserProfile = async (cognitoUserId: string) => {
    try {
      // Determine the API endpoint based on role
      const endpoint = formData.role === 'tenant' 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/tenants/create`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/landlords/create`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cognitoId: cognitoUserId, // Use the provided Cognito user ID
          name: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber.startsWith('+') 
            ? formData.phoneNumber 
            : `+88${formData.phoneNumber}`,
          gender: formData.gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Backend error response:', errorData);
        console.error('Response status:', response.status);
        
        // If the error is due to email already existing, try to update the existing user
        if (response.status === 400 && errorData?.field === 'email') {
          console.log('User with this email already exists, attempting to update...');
          
          // Try to update the existing user's cognitoId
          const updateEndpoint = formData.role === 'tenant' 
            ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/tenants/update-cognito-id`
            : `${process.env.NEXT_PUBLIC_API_BASE_URL}/landlords/update-cognito-id`;

          const updateResponse = await fetch(updateEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              newCognitoId: cognitoUserId,
            }),
          });

          if (updateResponse.ok) {
            console.log('Successfully updated existing user with correct cognitoId');
            return;
          } else {
            console.error('Failed to update existing user:', await updateResponse.text());
          }
        }
        
        throw new Error(`Failed to create user profile: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('User profile created:', result);
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw here as the Cognito account was created successfully
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(14,165,233,0.1)_1px,_transparent_0)] [background-size:20px_20px]"></div>
      
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 rounded-3xl mb-6 shadow-xl shadow-teal-200/50 border-2 border-white">
              <span className="text-3xl font-bold text-white drop-shadow-lg">HQ</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">HomeQuest</span> 
            </h1>
            <p className="text-gray-600">
              Your journey to the perfect home starts here
            </p>
          </div>

          {/* Progress */}
          <Card className="mb-6 border-teal-100 bg-gradient-to-r from-teal-50/50 to-cyan-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-teal-700">
                  Step {currentStep} of {showVerification ? 3 : 2}
                </span>
                <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                  {currentStep === 1 && 'Basic Info'}
                  {currentStep === 2 && 'Account Setup'}
                  {currentStep === 3 && 'Verification'}
                </Badge>
              </div>
              <Progress 
                value={currentStep === 1 ? 33 : currentStep === 2 ? 67 : 100} 
                className="h-3 bg-teal-100"
              />
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card className="border border-teal-100 bg-white shadow-lg shadow-teal-100/20">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl text-center text-gray-900">
                {currentStep === 1 && 'Tell Us About Yourself'}
                {currentStep === 2 && 'Complete Your Profile'}
                {currentStep === 3 && 'Verify Your Email'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 ? (
                // Step 1: Basic Information
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-teal-600" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) => updateFormData('fullName', e.target.value)}
                      className={errors.fullName ? 'border-red-300 focus:border-red-500' : 'focus:border-teal-500'}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-500">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-teal-600" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className={errors.email ? 'border-red-300 focus:border-red-500' : 'focus:border-teal-500'}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4 text-teal-600" />
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+880 1XXXXXXXXX"
                      value={formData.phoneNumber}
                      onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                      className={errors.phoneNumber ? 'border-red-300 focus:border-red-500' : 'focus:border-teal-500'}
                    />
                    {errors.phoneNumber && (
                      <p className="text-sm text-red-500">{errors.phoneNumber}</p>
                    )}
                  </div>

                  <Button 
                    onClick={handleNext}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : currentStep === 2 ? (
                // Step 2: Account Setup - Role, Gender, Password
                <div className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      I am joining as 
                      <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 border-0">Required</Badge>
                    </Label>
                    <RadioGroup 
                      value={formData.role} 
                      onValueChange={(value) => updateFormData('role', value as 'tenant' | 'landlord')}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 border-gray-200 hover:border-teal-300">
                          <div className="flex items-center space-x-2 absolute top-3 left-3">
                            <RadioGroupItem value="tenant" id="tenant" />
                          </div>
                          <Label htmlFor="tenant" className="cursor-pointer">
                            <CardContent className="flex flex-col items-center justify-center p-4 pt-8">
                              <div className="w-10 h-10 mb-3 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">Tenant</span>
                              <span className="text-xs text-gray-500 mt-1">Looking for home</span>
                            </CardContent>
                          </Label>
                        </Card>
                        
                        <Card className="relative cursor-pointer transition-all duration-200 hover:shadow-md border-2 border-gray-200 hover:border-teal-300">
                          <div className="flex items-center space-x-2 absolute top-3 left-3">
                            <RadioGroupItem value="landlord" id="landlord" />
                          </div>
                          <Label htmlFor="landlord" className="cursor-pointer">
                            <CardContent className="flex flex-col items-center justify-center p-4 pt-8">
                              <div className="w-10 h-10 mb-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                                <Home className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">Landlord</span>
                              <span className="text-xs text-gray-500 mt-1">Renting property</span>
                            </CardContent>
                          </Label>
                        </Card>
                      </div>
                    </RadioGroup>
                    {errors.role && (
                      <p className="text-sm text-red-500">{errors.role}</p>
                    )}
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      Gender 
                      <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 border-0">Required</Badge>
                    </Label>
                    <RadioGroup 
                      value={formData.gender} 
                      onValueChange={(value) => updateFormData('gender', value as 'male' | 'female')}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="relative cursor-pointer transition-all duration-200 hover:shadow-sm border-2 border-gray-200 hover:border-teal-300">
                          <div className="flex items-center space-x-2 absolute top-2 left-2">
                            <RadioGroupItem value="male" id="male" className="w-3 h-3" />
                          </div>
                          <Label htmlFor="male" className="cursor-pointer">
                            <CardContent className="flex items-center justify-center p-3 pt-6">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-teal-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs">♂</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900">Male</span>
                              </div>
                            </CardContent>
                          </Label>
                        </Card>
                        
                        <Card className="relative cursor-pointer transition-all duration-200 hover:shadow-sm border-2 border-gray-200 hover:border-teal-300">
                          <div className="flex items-center space-x-2 absolute top-2 left-2">
                            <RadioGroupItem value="female" id="female" className="w-3 h-3" />
                          </div>
                          <Label htmlFor="female" className="cursor-pointer">
                            <CardContent className="flex items-center justify-center p-3 pt-6">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-6 h-6 bg-gradient-to-br from-pink-400 to-teal-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-xs">♀</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900">Female</span>
                              </div>
                            </CardContent>
                          </Label>
                        </Card>
                      </div>
                    </RadioGroup>
                    {errors.gender && (
                      <p className="text-sm text-red-500">{errors.gender}</p>
                    )}
                  </div>

                  {/* Password Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-teal-600" />
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className={errors.password ? 'border-red-300 focus:border-red-500 pr-10' : 'focus:border-teal-500 pr-10'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-500">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-teal-600" />
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          className={errors.confirmPassword ? 'border-red-300 focus:border-red-500 pr-10' : 'focus:border-teal-500 pr-10'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleBack}
                      className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-50"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                // Step 3: Email Verification
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                      <p className="text-sm text-gray-600 mb-1">
                        We&apos;ve sent a verification code to:
                      </p>
                      <p className="text-sm font-medium text-teal-600">{formData.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationCode" className="text-sm font-medium">
                      Verification Code
                    </Label>
                    <Input
                      id="verificationCode"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="text-center text-lg tracking-widest focus:border-teal-500"
                      maxLength={6}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCurrentStep(2);
                        setShowVerification(false);
                      }}
                      className="flex-1 border-teal-300 text-teal-600 hover:bg-teal-50"
                      disabled={isVerifying}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleVerifyCode}
                      disabled={isVerifying || !verificationCode}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Verify & Complete
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Didn&apos;t receive the code?
                    </p>
                    <Button
                      variant="link"
                      className="text-teal-600 p-0 h-auto font-normal hover:underline text-sm"
                      onClick={handleResendCode}
                    >
                      Resend verification code
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Button
                variant="link"
                className="text-teal-600 p-0 h-auto font-normal hover:underline"
                onClick={() => router.push('/signin')}
              >
                Sign In
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}