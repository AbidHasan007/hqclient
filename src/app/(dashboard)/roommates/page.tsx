"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Star, CheckCircle, XCircle, User, MapPin, Calendar, Home, Shield, Clock } from 'lucide-react';
import Image from 'next/image';
import { 
  useGetRoommateRequestsQuery,
  useSendConnectionRequestMutation,
  useRespondToConnectionRequestMutation 
} from '@/state/api';

interface TenantHistory {
  id: number;
  startDate: string;
  endDate: string | null;
  property: {
    id: number;
    name: string;
    location: {
      address: string;
      city: string;
    };
  };
}

interface ActiveLease {
  id: number;
  startDate: string;
  property: {
    name: string;
    location: {
      address: string;
    };
  };
}

interface TenantInfo {
  id: number;
  name: string;
  gender: string;
  trustScore: number;
  verificationStatus: string;
  nidStatus: string;
  selfieUrl: string | null;
  createdAt: string;
  propertyHistory: TenantHistory[];
  leases: ActiveLease[];
}

interface ConnectionRequest {
  id: string;
  status: string;
  createdAt: string;
  requester?: TenantInfo;
  receiver?: TenantInfo;
}

const RoommatesPage = () => {
  const [activeTab, setActiveTab] = useState('sent');

  // RTK Query hooks
  const { 
    data: requestsData, 
    isLoading: isLoadingRequests 
  } = useGetRoommateRequestsQuery();

  const [sendConnectionRequestMutation, { isLoading: isSendingRequest }] = useSendConnectionRequestMutation();
  const [respondToRequestMutation, { isLoading: isRespondingToRequest }] = useRespondToConnectionRequestMutation();

  // Extract sent and received requests from API response
  const sentRequests = (requestsData as any)?.data?.sent || [];
  const receivedRequests = (requestsData as any)?.data?.received || [];



  // Handle connection request
  const handleSendConnectionRequest = async (receiverId: number) => {
    try {
      await sendConnectionRequestMutation({ 
        receiverId: receiverId.toString()
      }).unwrap();
    } catch (error) {
      console.error('Error sending connection request:', error);
    }
  };

  // Handle responding to connection request
  const handleRespondToRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      await respondToRequestMutation({ 
        requestId, 
        response 
      }).unwrap();
    } catch (error) {
      console.error('Error responding to request:', error);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Check if user already sent request to this person
  const hasRequestSent = (userId: number) => {
    return sentRequests.some((req: any) => req.receiver?.id === userId);
  };

  // Helper component to render tenant card with detailed info
  const TenantCard = ({ tenant, showActions, onAccept, onDecline, requestStatus, requestDate }: {
    tenant: TenantInfo;
    showActions?: boolean;
    onAccept?: () => void;
    onDecline?: () => void;
    requestStatus?: string;
    requestDate?: string;
  }) => {
    const getVerificationIcon = () => {
      if (tenant.nidStatus === 'VERIFIED') {
        return <Shield className="h-4 w-4 text-green-600" />;
      } else if (tenant.nidStatus === 'PENDING') {
        return <Clock className="h-4 w-4 text-yellow-600" />;
      }
      return <XCircle className="h-4 w-4 text-red-600" />;
    };

    const getVerificationBadge = () => {
      if (tenant.nidStatus === 'VERIFIED') {
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Verified</Badge>;
      } else if (tenant.nidStatus === 'PENDING') {
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Pending</Badge>;
      }
      return <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Unverified</Badge>;
    };

    const accountAge = Math.floor((new Date().getTime() - new Date(tenant.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    return (
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="pt-6">
          {/* Header with Photo and Basic Info */}
          <div className="flex items-start gap-4 mb-4">
            {/* Tenant Photo */}
            <div className="relative">
              {tenant.selfieUrl ? (
                <Image
                  src={tenant.selfieUrl}
                  alt={tenant.name}
                  width={80}
                  height={80}
                  className="rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                {getVerificationIcon()}
              </div>
            </div>

            {/* Name and Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg text-gray-900">{tenant.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{tenant.gender}</span>
                    <span className="text-gray-300">•</span>
                    {getVerificationBadge()}
                  </div>
                </div>
                {requestStatus && (
                  <Badge variant={requestStatus === 'accepted' ? 'default' : requestStatus === 'rejected' ? 'destructive' : 'secondary'}>
                    {requestStatus}
                  </Badge>
                )}
              </div>

              {/* Trust Score */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">Trust Score:</span>
                <span className={`font-semibold ${getTrustScoreColor(tenant.trustScore)}`}>
                  {tenant.trustScore}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Activity Log
            </h5>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Member since:</span>
                <span className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Account age:</span>
                <span className="font-medium">{accountAge} days</span>
              </div>
              {tenant.leases && tenant.leases.length > 0 && (
                <div className="flex items-start justify-between">
                  <span>Current residence:</span>
                  <span className="font-medium text-right ml-2">{tenant.leases[0].property.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Previous Lived History */}
          {tenant.propertyHistory && tenant.propertyHistory.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <h5 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Home className="h-3 w-3" />
                Previous Residences ({tenant.propertyHistory.length})
              </h5>
              <div className="space-y-2">
                {tenant.propertyHistory.slice(0, 2).map((history, idx) => (
                  <div key={history.id} className="bg-white rounded p-2 text-xs">
                    <div className="font-medium text-gray-900">{history.property.name}</div>
                    <div className="flex items-center gap-1 text-gray-600 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{history.property.location.city}</span>
                    </div>
                    <div className="text-gray-500 mt-1">
                      {new Date(history.startDate).toLocaleDateString()} - {history.endDate ? new Date(history.endDate).toLocaleDateString() : 'Present'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Date */}
          {requestDate && (
            <p className="text-xs text-gray-500 mb-3">
              Request sent: {new Date(requestDate).toLocaleDateString()}
            </p>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={onAccept}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={onDecline}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoadingRequests) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roommate</h1>
          <p className="text-gray-600 mt-1">Send and received requests</p>
        </div>
        
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Sent ({sentRequests.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Received ({receivedRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Sent Requests Tab */}
        <TabsContent value="sent">
          {sentRequests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sent requests</h3>
                <p className="text-gray-600">You haven&apos;t sent any connection requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sentRequests.map((request: any) => (
                <TenantCard
                  key={request.id}
                  tenant={request.receiver}
                  requestStatus={request.status}
                  requestDate={request.createdAt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Received Requests Tab */}
        <TabsContent value="received">
          {receivedRequests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No received requests</h3>
                <p className="text-gray-600">You haven&apos;t received any connection requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedRequests.map((request: any) => (
                <TenantCard
                  key={request.id}
                  tenant={request.requester}
                  showActions={request.status === 'pending'}
                  requestStatus={request.status}
                  requestDate={request.createdAt}
                  onAccept={() => handleRespondToRequest(request.id, 'accepted')}
                  onDecline={() => handleRespondToRequest(request.id, 'declined')}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoommatesPage;