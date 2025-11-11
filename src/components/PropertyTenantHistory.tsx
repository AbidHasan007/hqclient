"use client";

import React from 'react';
import { useGetPropertyHistoryQuery } from '@/state/api';
import { 
  Users, 
  Star, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Shield,
  Clock,
  MessageSquare,
  User,
  Award,
  Info,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

interface PropertyTenantHistoryProps {
  propertyId: number;
}

const PropertyTenantHistory: React.FC<PropertyTenantHistoryProps> = ({ propertyId }) => {
  const { data, isLoading, isError } = useGetPropertyHistoryQuery(propertyId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading tenant history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center py-8 text-slate-500">
          <Info size={24} className="mx-auto mb-2 opacity-50" />
          <p>Unable to load tenant history</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Tenant History</h2>
        </div>
        <div className="text-center py-8 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Previous Tenants</p>
          <p className="text-sm mt-2">This property hasn&apos;t had any tenants yet.</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'TERMINATED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PENDING_START':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <Shield size={12} />
            <span>Verified</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center gap-1 text-yellow-600 text-xs">
            <Clock size={12} />
            <span>Pending</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <XCircle size={12} />
            <span>Not Verified</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tenant History</h2>
            <p className="text-sm text-slate-600">Public transparency record</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-purple-200">
          <TrendingUp size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-slate-700">
            {data.length} {data.length === 1 ? 'Lease' : 'Leases'}
          </span>
        </div>
      </div>

      {/* History List */}
      <div className="p-6 space-y-6">
        {data.map((lease: any, index: number) => {
          const isCurrentLease = lease.status === 'ACTIVE';
          const averageRating = lease.reviews && lease.reviews.length > 0
            ? (lease.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / lease.reviews.length).toFixed(1)
            : null;

          return (
            <div
              key={lease.leaseId}
              className={`border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-md ${
                isCurrentLease
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              {/* Lease Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-lg">
                        Lease #{lease.leaseId}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(lease.status)}`}>
                        {lease.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>
                          {format(new Date(lease.startDate), 'MMM dd, yyyy')}
                          {lease.endDate && ` - ${format(new Date(lease.endDate), 'MMM dd, yyyy')}`}
                          {!lease.endDate && ' - Ongoing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-blue-600">
                        ৳{lease.rent.toLocaleString()} /month
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average Rating */}
                {averageRating && (
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-yellow-200">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-slate-800">{averageRating}</span>
                    <span className="text-xs text-slate-500">({lease.reviews.length})</span>
                  </div>
                )}
              </div>

              {/* Tenants Section */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <User size={14} />
                  Tenants ({lease.tenants.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lease.tenants.map((tenant: any) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{tenant.name}</p>
                            {tenant.role === 'PRIMARY' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getVerificationBadge(tenant.nidStatus)}
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-500">{tenant.gender}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Award size={14} className={getTrustScoreColor(tenant.trustScore)} />
                          <span className={`text-sm font-bold ${getTrustScoreColor(tenant.trustScore)}`}>
                            {tenant.trustScore}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Trust Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews Section */}
              {lease.reviews && lease.reviews.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <MessageSquare size={14} />
                    Landlord Reviews ({lease.reviews.length})
                  </h4>
                  <div className="space-y-3">
                    {lease.reviews.map((review: any) => (
                      <div
                        key={review.id}
                        className="p-4 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={`${
                                    star <= review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {review.landlordName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-slate-600 italic">&quot;{review.comment}&quot;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyTenantHistory;
