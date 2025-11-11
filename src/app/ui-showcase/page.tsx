'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Info, Star, Home, User } from 'lucide-react';

const UIShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Shadcn UI Showcase</h1>
          <p className="text-muted-foreground text-lg">
            A comprehensive demonstration of Shadcn UI components with Tailwind CSS
          </p>
        </div>

        <Separator />

        {/* Cards & Layout */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cards & Layout</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Card
                </CardTitle>
                <CardDescription>
                  Beautiful 2BHK apartment with modern amenities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Monthly Rent</span>
                    <Badge variant="secondary">₹25,000</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    <Badge variant="outline">Dhaka, Bangladesh</Badge>
                  </div>
                  <Button className="w-full mt-4">View Details</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Profile
                </CardTitle>
                <CardDescription>
                  Tenant profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Verified</Badge>
                    <Badge variant="secondary">Premium</Badge>
                  </div>
                  <Progress value={85} className="h-2" />
                  <p className="text-sm text-muted-foreground">Profile completion: 85%</p>
                  <Button variant="outline" className="w-full">Edit Profile</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>
                  Platform overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Listings</span>
                    <Badge variant="default">1,234</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verified Landlords</span>
                    <Badge variant="secondary">567</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Happy Tenants</span>
                    <Badge variant="outline">2,890</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Alerts & Notifications */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Alerts & Notifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                Your profile verification is pending. Please upload the required documents.
              </AlertDescription>
            </Alert>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                Your property listing has been approved and is now live!
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Warning</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your subscription expires in 3 days. Renew now to avoid service interruption.
              </AlertDescription>
            </Alert>

            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Error</AlertTitle>
              <AlertDescription className="text-red-700">
                Failed to upload document. Please check file format and try again.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Forms & Inputs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Forms & Inputs</h2>
          <Card>
            <CardHeader>
              <CardTitle>Property Listing Form</CardTitle>
              <CardDescription>
                Add a new property to your listings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Property Title</Label>
                      <Input id="title" placeholder="Enter property title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rent">Monthly Rent</Label>
                      <Input id="rent" type="number" placeholder="₹25,000" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Describe your property..." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Property Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">Independent House</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="space-y-4">
                    <Label>Property Features</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="furnished" />
                        <Label htmlFor="furnished">Fully Furnished</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="parking" />
                        <Label htmlFor="parking">Parking Available</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="gym" />
                        <Label htmlFor="gym">Gym/Fitness Center</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="pool" />
                        <Label htmlFor="pool">Swimming Pool</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Preferred Gender</Label>
                    <RadioGroup defaultValue="any">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male">Male Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female">Female Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="any" id="any" />
                        <Label htmlFor="any">Any Gender</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Pets</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow tenants to have pets in the property
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Smoking Allowed</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow smoking inside the property
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Instant Booking</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow tenants to book without approval
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">Save Draft</Button>
                <Button variant="outline" className="flex-1">Preview</Button>
                <Button variant="default" className="flex-1">Publish Listing</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Progress & Loading */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Progress & Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Verification in progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>NID Verification</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Address Proof</span>
                    <span>60%</span>
                  </div>
                  <Progress value={60} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Income Certificate</span>
                    <span>20%</span>
                  </div>
                  <Progress value={20} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating & Reviews</CardTitle>
                <CardDescription>
                  Overall property rating
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">4.0</span>
                  <span className="text-sm text-muted-foreground">(124 reviews)</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-8">5★</span>
                    <Progress value={70} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-8">87</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-8">4★</span>
                    <Progress value={20} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-8">25</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-8">3★</span>
                    <Progress value={8} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-8">10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-8">2★</span>
                    <Progress value={2} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-8">2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-8">1★</span>
                    <Progress value={0} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-8">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>
                  Current verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Verified</span>
                    <Badge variant="default">✓ Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Phone Verified</span>
                    <Badge variant="default">✓ Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Identity Verified</span>
                    <Badge variant="secondary">⏳ Pending</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Address Verified</span>
                    <Badge variant="outline">⏸ Not Started</Badge>
                  </div>
                </div>
                <Separator />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Overall Progress: 50%
                  </p>
                  <Progress value={50} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-8">
          <p className="text-muted-foreground">
            Built with Shadcn UI and Tailwind CSS - No custom CSS required! 🎨
          </p>
        </div>
      </div>
    </div>
  );
};

export default UIShowcase;