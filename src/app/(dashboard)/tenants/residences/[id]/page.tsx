"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetAuthUserQuery,
  useGetLeasesQuery,
  useGetPaymentsQuery,
  useGetPropertyQuery,
  useCreateTerminationRequestMutation,
  useRemoveRoommateMutation,
} from "@/state/api";
import { 
  ArrowLeft,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  User,
  Users,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  Camera,
  Bed,
  Bath,
  Square,
  Car,
  Wifi,
  Zap,
  Droplets,
  Shield,
  CheckCircle,
  Download,
  Check,
  CreditCard,
  Edit,
  ArrowDownToLineIcon,
  BanknoteArrowDown,
  UserMinus,
  X
} from "lucide-react";

const ResidenceDetailPage = () => {
  const params = useParams();
  const propertyId = params.id;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removeRoommateDialogOpen, setRemoveRoommateDialogOpen] = useState(false);
  const [selectedRoommate, setSelectedRoommate] = useState<any>(null);

  // API Queries
  const { data: authUser } = useGetAuthUserQuery();
  const [removeRoommate, { isLoading: isRemoving }] = useRemoveRoommateMutation();
  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useGetPropertyQuery(Number(propertyId));

  const { data: leases, isLoading: leasesLoading } = useGetLeasesQuery(
    parseInt(authUser?.cognitoInfo?.userId || "0"),
    { skip: !authUser?.cognitoInfo?.userId }
  );
  
  const currentLease = leases?.find(
    (lease) => lease.propertyId === property?.id
  );

  // Debug logging
  React.useEffect(() => {
    if (currentLease) {
      console.log('Current Lease Data:', {
        id: currentLease.id,
        propertyId: currentLease.propertyId,
        hasTenantsArray: !!currentLease.tenants,
        tenantCount: currentLease.tenants?.length || 0,
        tenants: currentLease.tenants
      });
    }
  }, [currentLease]);

  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery(
    currentLease?.id || 0,
    { skip: !currentLease?.id }
  );

  const [createTerminationRequest] = useCreateTerminationRequestMutation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const daysRemaining = () => {
    if (!currentLease) return 0;
    const endDate = new Date(currentLease.endDate);
    const now = new Date();
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const isLeaseEndingSoon = () => {
    return daysRemaining() <= 30;
  };

  const handleLeaveRequest = async () => {
    if (!currentLease?.id) {
      console.error("No active lease found");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTerminationRequest({
        leaseId: currentLease.id,
        reason: reason.trim() || undefined
      }).unwrap();
      
      setLeaveModalOpen(false);
      setReason(""); // Clear the reason field
    } catch (error) {
      console.error("Failed to submit termination request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRoommate = async () => {
    if (!selectedRoommate) return;

    try {
      await removeRoommate({ 
        roommateCognitoId: selectedRoommate.tenantCognitoId 
      }).unwrap();
      
      setRemoveRoommateDialogOpen(false);
      setSelectedRoommate(null);
    } catch (error) {
      console.error("Failed to remove roommate:", error);
    }
  };

  // Check if current user is the primary tenant
  const isPrimaryTenant = currentLease?.tenants?.some(
    (t: any) => t.tenantCognitoId === authUser?.cognitoInfo?.userId && t.role === 'PRIMARY'
  );

  // Mock data for features when property data is available
  const getPropertyFeatures = () => {
    if (!property) return [];
    return [
      "Floor-to-ceiling windows with city views",
      "Modern kitchen with stainless steel appliances",
      "Hardwood floors throughout",
      "Central air conditioning and heating",
      "In-unit washer and dryer",
      "Private balcony",
      "Building gym and rooftop terrace",
      "24/7 concierge service"
    ];
  };

  const getPropertyAmenities = () => {
    return [
      { icon: Bed, label: "2 Bedrooms" },
      { icon: Bath, label: "2 Bathrooms" },
      { icon: Square, label: "1,200 sq ft" },
      { icon: Car, label: "1 Parking Space" },
      { icon: Wifi, label: "High Speed Internet" },
      { icon: Zap, label: "Utilities Included" },
      { icon: Droplets, label: "In-Unit Laundry" },
      { icon: Shield, label: "24/7 Security" }
    ];
  };

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;
  
  if (!property || propertyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200">
          <div className="text-red-600 text-center">
            <h2 className="text-lg font-semibold mb-2">Error Loading Property</h2>
            <p>Property not found or an error occurred</p>
          </div>
        </div>
      </div>
    );
  }

  const propertyImages = property.images && property.images.length > 0 
    ? property.images 
    : ["/placeholder.jpg", "/singlelisting-2.jpg", "/singlelisting-3.jpg"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Residences
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{property.title || property.name}</h1>
            <div className="flex items-center gap-2 text-gray-600 mt-1">
              <MapPin className="h-4 w-4" />
              <span>
                {property.location?.address}, {property.location?.city}, {property.location?.state || property.location?.country}
              </span>
            </div>
          </div>
          {currentLease && isLeaseEndingSoon() && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Lease Ending Soon
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden shadow-lg border-0">
              <div className="relative h-96 w-full">
                <Image
                  src={propertyImages[activeImageIndex]}
                  alt={property.title || property.name || "Property"}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-md text-sm">
                  {activeImageIndex + 1} / {propertyImages.length}
                </div>
              </div>
              {propertyImages.length > 1 && (
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {propertyImages.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          activeImageIndex === index
                            ? 'border-teal-500 scale-105'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${property.title || property.name} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Property Details Tabs */}
            <Card className="shadow-lg border-0">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="details" 
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="amenities"
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    Amenities
                  </TabsTrigger>
                  <TabsTrigger 
                    value="lease"
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    Lease Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payments"
                    className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                  >
                    Payments
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Property Description</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {property.description || "Experience modern living in this beautifully appointed property. Located in a prime area with easy access to local amenities, shopping, and transportation."}
                    </p>
                    
                    <Separator className="my-4" />
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Key Features</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getPropertyFeatures().map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="amenities" className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getPropertyAmenities().map((amenity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <amenity.icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <span className="font-medium text-gray-900">{amenity.label}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="lease" className="p-6">
                  {currentLease ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BanknoteArrowDown className="h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium text-gray-500">Monthly Rent</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(currentLease.rent || currentLease.monthlyRent)}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium text-gray-500">Security Deposit</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(currentLease.securityDeposit || currentLease.rent || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium text-gray-500">Lease Period</span>
                          </div>
                          <p className="text-gray-900">
                            {formatDate(currentLease.startDate)} - {formatDate(currentLease.endDate)}
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-teal-600" />
                            <span className="text-sm font-medium text-gray-500">Days Remaining</span>
                          </div>
                          <p className="text-gray-900">
                            {daysRemaining()} days
                          </p>
                        </div>
                      </div>
                      
                      {/* Roommates Section */}
                      {currentLease.tenants && currentLease.tenants.length > 0 && (
                        <>
                          <Separator />
                          
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="h-5 w-5 text-teal-600" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                Lease Participants ({currentLease.tenants.length})
                              </h3>
                            </div>
                            
                            <div className="space-y-3">
                              {currentLease.tenants.map((leaseTenant: any) => {
                                const isCurrentUser = leaseTenant.tenantCognitoId === authUser?.cognitoInfo?.userId;
                                const canRemove = isPrimaryTenant && 
                                               leaseTenant.role === 'ROOMMATE' && 
                                               !isCurrentUser &&
                                               currentLease.tenants.length > 1;
                                
                                return (
                                  <div 
                                    key={leaseTenant.id} 
                                    className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-100 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                        {leaseTenant.tenant.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="font-semibold text-gray-900">
                                            {leaseTenant.tenant.name}
                                            {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(You)</span>}
                                          </p>
                                          <Badge 
                                            variant={leaseTenant.role === 'PRIMARY' ? 'default' : 'secondary'}
                                            className={`text-xs ${
                                              leaseTenant.role === 'PRIMARY' 
                                                ? 'bg-teal-600 text-white' 
                                                : 'bg-blue-600 text-white'
                                            }`}
                                          >
                                            {leaseTenant.role}
                                          </Badge>
                                          {leaseTenant.tenant.nidStatus === 'VERIFIED' && (
                                            <Badge variant="outline" className="text-xs border-green-600 text-green-600">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Verified
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600">{leaseTenant.tenant.email}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Joined: {formatDate(leaseTenant.joinedAt)}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-gray-500">Monthly Share</p>
                                        <p className="text-xl font-bold text-teal-600">
                                          {leaseTenant.rentShare 
                                            ? formatCurrency(leaseTenant.rentShare)
                                            : formatCurrency(currentLease.rent / (currentLease.tenants?.length || 1))
                                          }
                                        </p>
                                        {leaseTenant.tenant.trustScore !== undefined && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Trust Score: <span className="font-semibold text-gray-700">{leaseTenant.tenant.trustScore.toFixed(1)}</span>
                                          </p>
                                        )}
                                      </div>
                                      
                                      {canRemove && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                          onClick={() => {
                                            setSelectedRoommate(leaseTenant);
                                            setRemoveRoommateDialogOpen(true);
                                          }}
                                        >
                                          <UserMinus className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Summary */}
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">
                                  Total Monthly Rent:
                                </span>
                                <span className="text-lg font-bold text-gray-900">
                                  {formatCurrency(currentLease.rent)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm font-medium text-gray-600">
                                  Rent per Person:
                                </span>
                                <span className="text-lg font-bold text-teal-600">
                                  {formatCurrency(currentLease.rent / (currentLease.tenants?.length || 1))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No active lease information available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="p-6">
                  {payments && payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 mr-2" />
                                  Invoice #{payment.id}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={payment.paymentStatus === "Paid" ? "default" : "secondary"}>
                                  {payment.paymentStatus === "Paid" && <Check className="w-4 h-4 mr-1" />}
                                  {payment.paymentStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatDate(payment.paymentDate)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(payment.amountPaid)}
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No payment history available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Landlord Contact */}
            {property.landlord && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-teal-600" />
                    Landlord Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {property.landlord.name}
                      </p>
                      <p className="text-sm text-gray-500">Property Owner</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    {property.landlord.email && (
                      <a 
                        href={`mailto:${property.landlord.email}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Mail className="h-4 w-4 text-teal-600" />
                        <span className="text-gray-900">{property.landlord.email}</span>
                      </a>
                    )}
                    
                    {property.landlord.phoneNumber && (
                      <a 
                        href={`tel:${property.landlord.phoneNumber}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-teal-600" />
                        <span className="text-gray-900">{property.landlord.phoneNumber}</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-200 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Lease Document
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-200 hover:bg-gray-50"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Payment History
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-gray-200 hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
                
                <Separator />
                
                {currentLease && (
                  <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="w-full justify-start"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Request Lease Termination
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Request Lease Termination
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>Important:</strong> Terminating your lease early may result in penalties. 
                            Please review your lease agreement or contact your landlord for details.
                          </p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Reason for termination (optional)
                          </label>
                          <Textarea
                            placeholder="Please provide a reason for your lease termination request..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setLeaveModalOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleLeaveRequest}
                            disabled={isSubmitting}
                            className="flex-1"
                          >
                            {isSubmitting ? "Submitting..." : "Submit Request"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Lease Status */}
            {currentLease && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-teal-600" />
                    Lease Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Status</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Days Remaining</span>
                      <span className={`font-medium ${isLeaseEndingSoon() ? 'text-red-600' : 'text-gray-900'}`}>
                        {daysRemaining()} days
                      </span>
                    </div>
                    
                    {isLeaseEndingSoon() && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Lease Expiring Soon
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Contact your landlord to discuss renewal options.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Remove Roommate Confirmation Dialog */}
      <Dialog open={removeRoommateDialogOpen} onOpenChange={setRemoveRoommateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Remove Roommate
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-2">Confirm Removal</h4>
                  <p className="text-sm text-amber-700">
                    Are you sure you want to remove <strong>{selectedRoommate?.tenant.name}</strong> from this lease?
                  </p>
                  <ul className="text-sm space-y-1 text-amber-700 list-disc pl-4 mt-2">
                    <li>They will no longer have access to this residence</li>
                    <li>Rent will be redistributed among remaining tenants</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            {selectedRoommate && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedRoommate.tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedRoommate.tenant.name}</p>
                    <p className="text-sm text-gray-600">{selectedRoommate.tenant.email}</p>
                    <p className="text-xs text-gray-500">
                      Current rent share: {selectedRoommate.rentShare ? formatCurrency(selectedRoommate.rentShare) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setRemoveRoommateDialogOpen(false);
                setSelectedRoommate(null);
              }}
              disabled={isRemoving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveRoommate}
              disabled={isRemoving}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove Roommate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidenceDetailPage;