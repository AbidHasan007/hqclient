import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Calendar, 
  Home, 
  Star, 
  Users, 
  CheckCircle, 
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';
import { useGetTenantQuery } from '@/state/api';

interface TenantActivityModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TenantActivityModal = ({ tenantId, isOpen, onClose }: TenantActivityModalProps) => {
  const { data: tenant, isLoading } = useGetTenantQuery(tenantId, {
    skip: !isOpen || !tenantId,
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const calculateAccountAge = (createdAt: string | undefined) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMonths = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffInMonths < 1) return 'Less than a month';
    if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'}`;
    const years = Math.floor(diffInMonths / 12);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Building Trust';
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Activity...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tenant) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tenant Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center text-gray-500 p-4">
            Unable to load tenant activity information.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate active leases
  const activeLeases = tenant.leases?.filter((lease: any) => lease.status === 'ACTIVE') || [];
  const completedLeases = tenant.leases?.filter((lease: any) => lease.status === 'COMPLETED' || lease.status === 'TERMINATED') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tenant Activity Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trust Score Section */}
          <Card className={`border-2 ${getTrustScoreColor(tenant.trustScore || 0)}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trust Score</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl font-bold ${getTrustScoreColor(tenant.trustScore || 0)}`}>
                      {tenant.trustScore || 0}
                    </span>
                    <Badge variant="outline" className={getTrustScoreColor(tenant.trustScore || 0)}>
                      {getTrustScoreLabel(tenant.trustScore || 0)}
                    </Badge>
                  </div>
                </div>
                <CheckCircle className={`w-16 h-16 ${getTrustScoreColor(tenant.trustScore || 0).split(' ')[0]}`} />
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Account Created</p>
                    <p className="font-semibold text-gray-900">{formatDate(tenant.createdAt)}</p>
                    <p className="text-xs text-gray-500 mt-1">Active for {calculateAccountAge(tenant.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Verification Status</p>
                    <Badge 
                      variant={tenant.nidStatus === 'VERIFIED' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {tenant.nidStatus === 'VERIFIED' ? 'Verified' : tenant.nidStatus || 'Not Verified'}
                    </Badge>
                    {tenant.verifiedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verified on {formatDate(tenant.verifiedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lease History */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-teal-500" />
                <h3 className="font-semibold text-gray-900">Rental History</h3>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{activeLeases.length}</p>
                  <p className="text-xs text-gray-600">Active Lease{activeLeases.length !== 1 ? 's' : ''}</p>
                  {activeLeases.length > 1 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Multiple active</p>
                  )}
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{completedLeases.length}</p>
                  <p className="text-xs text-gray-600">Past Lease{completedLeases.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {(tenant.leases?.length || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Rentals</p>
                </div>
              </div>

              {/* Active Leases Details */}
              {activeLeases.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Current Residence{activeLeases.length > 1 ? 's' : ''}
                    {activeLeases.length > 1 && (
                      <Badge variant="destructive" className="text-xs ml-2">
                        ⚠️ Multiple Active Leases
                      </Badge>
                    )}
                  </p>
                  {activeLeases.map((lease: any, index: number) => (
                    <div key={lease.id || index} className="border-l-4 border-teal-500 pl-4 py-2 bg-teal-50 rounded-r-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {lease.property?.name || 'Property'}
                          </p>
                          {lease.property?.location && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {lease.property.location.city || lease.property.location.address}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Started: {formatDate(lease.startDate)}</span>
                            {lease.endDate && <span>Ends: {formatDate(lease.endDate)}</span>}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-teal-600">Active</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No lease message */}
              {!tenant.leases || tenant.leases.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No rental history available
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Ratings Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Landlord Ratings</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {tenant.receivedRatings?.length || 0}
                      </span>
                      <span className="text-sm text-gray-500">rating{tenant.receivedRatings?.length !== 1 ? 's' : ''} received</span>
                    </div>
                    {tenant.receivedRatings && tenant.receivedRatings.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Avg: {(tenant.receivedRatings.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / tenant.receivedRatings.length).toFixed(1)}/5
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Roommate Ratings</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {tenant.givenRatings?.length || 0}
                      </span>
                      <span className="text-sm text-gray-500">rating{tenant.givenRatings?.length !== 1 ? 's' : ''} given</span>
                    </div>
                    {tenant.sentConnections && (
                      <p className="text-xs text-gray-500 mt-2">
                        {tenant.sentConnections.length} roommate connection{tenant.sentConnections.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Community Engagement */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900">Community Engagement</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {tenant.posts?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Posts Created</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">
                    {tenant.comments?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Comments Made</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantActivityModal;