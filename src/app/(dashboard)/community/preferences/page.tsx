"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { 
  useGetRoommatePreferenceQuery,
  useUpdateRoommatePreferenceMutation
} from '@/state/api';

interface RoommatePreference {
  id?: string;
  genderPref: string;
  area: string;
  budgetRange: string;
  lifestyle?: string;
}

const PreferencesPage = () => {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RoommatePreference>({
    genderPref: '',
    area: '',
    budgetRange: '',
    lifestyle: ''
  });
  const [currentGender, setCurrentGender] = useState<string>('');

  // RTK Query hooks
  const { 
    data: preferenceData, 
    isLoading, 
    error 
  } = useGetRoommatePreferenceQuery();

  const [updatePreferences, { isLoading: isSaving }] = useUpdateRoommatePreferenceMutation();

  // Load existing preferences and tenant gender when data is available
  useEffect(() => {
    if (preferenceData) {
      // Get tenant's gender from the response
      const tenantGender = (preferenceData as any)?.tenantGender || '';
      setCurrentGender(tenantGender);
      
      // If user has existing preferences, load them
      if ((preferenceData as any)?.data) {
        const pref = (preferenceData as any).data;
        // If user didn't previously set genderPref, default to their own gender
        if (!pref.genderPref || String(pref.genderPref).trim() === '') {
          pref.genderPref = tenantGender || pref.genderPref || '';
        }
        setPreferences(pref);
      } else {
        // No existing preferences, just set the gender
        setPreferences(prev => ({ ...prev, genderPref: tenantGender }));
      }
    }
  }, [preferenceData]);

  // Save preferences
  const savePreferences = async () => {
    if (!preferences.genderPref || !preferences.area || !preferences.budgetRange) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updatePreferences(preferences).unwrap();
      toast.success('Preferences saved successfully!');
      router.push('/community');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleInputChange = (field: keyof RoommatePreference, value: string) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push('/community')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roommate Preferences</h1>
          <p className="text-gray-600">Set your preferences to find compatible roommates</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Preferences
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Gender (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="genderPref" className="text-sm font-medium">
              Gender <span className="text-red-500">*</span>
            </Label>
            <input
              id="genderPref"
              type="text"
              value={currentGender || preferences.genderPref}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
            />
            <p className="text-sm text-gray-500">This value is taken from your profile and cannot be changed here.</p>
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label htmlFor="area" className="text-sm font-medium">
              Preferred Area <span className="text-red-500">*</span>
            </Label>
            <Select value={preferences.area} onValueChange={(value: string) => handleInputChange('area', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dhaka">Dhaka</SelectItem>
                <SelectItem value="Chittagong">Chittagong</SelectItem>
                <SelectItem value="Sylhet">Sylhet</SelectItem>
                <SelectItem value="Rajshahi">Rajshahi</SelectItem>
                <SelectItem value="Khulna">Khulna</SelectItem>
                <SelectItem value="Barisal">Barisal</SelectItem>
                <SelectItem value="Rangpur">Rangpur</SelectItem>
                <SelectItem value="Mymensingh">Mymensingh</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Area where you want to find roommates
            </p>
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Label htmlFor="budgetRange" className="text-sm font-medium">
              Budget Range (Monthly) <span className="text-red-500">*</span>
            </Label>
            <Select value={preferences.budgetRange} onValueChange={(value: string) => handleInputChange('budgetRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5000-10000">৳5,000 - ৳10,000</SelectItem>
                <SelectItem value="10000-15000">৳10,000 - ৳15,000</SelectItem>
                <SelectItem value="15000-20000">৳15,000 - ৳20,000</SelectItem>
                <SelectItem value="20000-25000">৳20,000 - ৳25,000</SelectItem>
                <SelectItem value="25000-30000">৳25,000 - ৳30,000</SelectItem>
                <SelectItem value="30000+">৳30,000+</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Your monthly budget for shared accommodation
            </p>
          </div>

          {/* Lifestyle */}
          <div className="space-y-2">
            <Label htmlFor="lifestyle" className="text-sm font-medium">
              Lifestyle & Additional Info
            </Label>
            <Textarea
              placeholder="Describe your lifestyle, habits, work schedule, or any other relevant information..."
              value={preferences.lifestyle || ''}
              onChange={(e) => handleInputChange('lifestyle', e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              Optional: Help potential roommates understand your lifestyle better
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={savePreferences}
              disabled={isSaving || !preferences.genderPref || !preferences.area || !preferences.budgetRange}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-teal-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-teal-900 mb-1">How Matching Works</h4>
              <p className="text-sm text-teal-700">
                We match you with people who have similar preferences in the same area and budget range. 
                Your trust score and verification status also play a role in finding compatible roommates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreferencesPage;
