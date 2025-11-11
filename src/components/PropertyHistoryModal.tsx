import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useGetPropertyQuery } from '@/state/api';
import { Property } from '@/types/prismaTypes';
import { History } from 'lucide-react';

interface Lease {
  id: number;
  startDate: string;
  endDate?: string | null;
  status: 'ACTIVE' | 'TERMINATED' | 'PENDING_START';
  createdAt: string;
  updatedAt: string;
  tenant?: {
    name: string;
  };
}

interface Review {
  id: number;
  rating: number;
  createdAt: string;
  tenant?: {
    name: string;
  };
}

interface SafetyReport {
  id: number;
  createdAt: string;
  tenant?: {
    name: string;
  };
}

interface PropertyEvent {
  date: string;
  type: string;
  description?: string;
  tenant?: {
    name: string;
  };
}

interface PropertyHistoryModalProps {
  propertyId: number;
  isOpen: boolean;
  onClose: () => void;
}

const PropertyHistoryModal = ({ propertyId, isOpen, onClose }: PropertyHistoryModalProps) => {
  const { data: property, isLoading } = useGetPropertyQuery(propertyId, {
    skip: !isOpen, // Only fetch when modal is open
  });
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Date not available';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // Transform property data into history events
  const historyEvents: PropertyEvent[] = React.useMemo(() => {
    if (!property) return [];

    const events: PropertyEvent[] = [];

    // Add property listing (using postedDate from schema)
    if (property.postedDate) {
      events.push({
        date: property.postedDate,
        type: 'Property Listed',
        description: `Listed by ${property.landlord?.name || 'Landlord'} - ${property.beds} bed, ${property.baths} bath ${property.propertyType.toLowerCase()} for ৳${property.pricePerMonth}/month`
      });
    }

    if (property.updatedAt && property.updatedAt !== property.postedDate) {
      events.push({
        date: property.updatedAt,
        type: 'Property Updated',
        description: 'Property details were updated'
      });
    }

    // Add verification events if available
    if (property.isVerified) {
      events.push({
        date: property.verifiedAt || property.updatedAt || property.createdAt,
        type: 'Property Verified',
        description: 'Property was verified by admin'
      });
    }

    // Add lease events
    if (Array.isArray(property.leases)) {
      property.leases.forEach((lease: Lease) => {
        if (!lease) return;

        // Lease application/request
        events.push({
          date: lease.createdAt,
          type: 'Lease Requested',
          description: `Lease application submitted by ${lease.tenant?.name || 'tenant'}`,
          tenant: lease.tenant
        });

        // Lease approval/rejection
        if (lease.status === 'PENDING_START') {
          events.push({
            date: lease.updatedAt,
            type: 'Lease Pending',
            description: `Lease is pending approval for ${lease.tenant?.name || 'tenant'}`,
            tenant: lease.tenant
          });
        }

        // Lease start
        if (lease.startDate && lease.status === 'ACTIVE') {
          events.push({
            date: lease.startDate,
            type: 'Lease Started',
            description: `New lease period started with ${lease.tenant?.name || 'tenant'}`,
            tenant: lease.tenant
          });
        }

        // Lease status changes
        if (lease.status === 'TERMINATED') {
          events.push({
            date: lease.endDate || lease.updatedAt || lease.startDate,
            type: 'Lease Terminated',
            description: 'Lease was terminated early',
            tenant: lease.tenant
          });
        }
      });
    }

    // Add any reviews if available
    if (Array.isArray(property.reviews)) {
      property.reviews.forEach((review: Review) => {
        if (!review) return;
        events.push({
          date: review.createdAt,
          type: 'Review Added',
          description: `New review (${review.rating}/5 stars)${review.tenant ? ` by ${review.tenant.name}` : ''}`,
          tenant: review.tenant
        });
      });
    }

    // Add safety reports if available
    if (Array.isArray(property.safetyReports)) {
      property.safetyReports.forEach((report: SafetyReport) => {
        if (!report) return;
        events.push({
          date: report.createdAt,
          type: 'Safety Report',
          description: `Safety report submitted${report.tenant ? ` by ${report.tenant.name}` : ''}`,
          tenant: report.tenant
        });
      });
    }

    // Sort events by date (most recent first) and filter out any with invalid dates
    return events
      .filter(event => {
        try {
          return !isNaN(new Date(event.date).getTime());
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [property]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Property History
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto px-1">
          {!property ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : historyEvents.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              No history available for this property.
            </div>
          ) : (
            <div className="space-y-4">
              {historyEvents.map((event, index: number) => (
                <div
                  key={`${event.type}-${index}`}
                  className="border-l-2 border-teal-500 pl-4 relative pb-4"
                >
                  <div className="absolute w-3 h-3 bg-teal-500 rounded-full -left-[7px] top-0" />
                  <div className="text-sm text-gray-500">
                    {formatDate(event.date)}
                  </div>
                  <div className="font-medium">{event.type}</div>
                  {event.description && (
                    <div className="text-sm text-gray-600 mt-1">
                      {event.description}
                    </div>
                  )}
                  {event.tenant && (
                    <div className="text-sm text-gray-600 mt-1">
                      Tenant: {event.tenant.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyHistoryModal;