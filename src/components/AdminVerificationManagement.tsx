import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  Mail 
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useGetPendingVerificationsQuery, useApproveVerificationMutation, useRejectVerificationMutation } from '@/state/api';

interface Verification {
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  nidNumber?: string;
  address?: string;
  nidDocumentUrl?: string;
  addressProofUrl?: string;
  selfieUrl?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  adminNotes?: string;
  userType: 'landlord' | 'tenant';
  verificationStatus?: string;
  nidStatus?: string;
}

type VerificationType = 'landlord' | 'tenant';

interface PendingVerification {
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  nidNumber?: string;
  address?: string;
  nidDocumentUrl?: string;
  addressProofUrl?: string;
  selfieUrl?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  adminNotes?: string;
  userType: VerificationType;
  verificationStatus?: string;
}

interface PendingVerificationsResponse {
  landlords: PendingVerification[];
  tenants: PendingVerification[];
}

interface AdminVerificationManagementProps {
  isAdmin: boolean;
}

const AdminVerificationManagement: React.FC<AdminVerificationManagementProps> = ({ isAdmin }) => {
  const [selectedUser, setSelectedUser] = useState<Verification | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'landlord' | 'tenant'>('all');

  // RTK Query hooks
  const { 
    data: pendingVerificationsData, 
    isLoading, 
    error: fetchError 
  } = useGetPendingVerificationsQuery(undefined, {
    skip: !isAdmin,
  });

  // Ensure pendingVerifications is always an array and properly typed
  const pendingVerifications = React.useMemo(() => {
    if (!pendingVerificationsData) {
      return [];
    }

    const landlords = (pendingVerificationsData.landlords || []).map(l => ({
      ...l,
      userType: 'landlord' as const
    }));
    
    const tenants = (pendingVerificationsData.tenants || []).map(t => ({
      ...t,
      userType: 'tenant' as const
    }));
    
    return [...landlords, ...tenants];
  }, [pendingVerificationsData]);

  // Filter verifications based on user type
  const filteredVerifications = pendingVerifications.filter(user => 
    filterType === 'all' || user.userType === filterType
  );
  
  const [approveVerification, { isLoading: approveLoading }] = useApproveVerificationMutation();
  const [rejectVerification, { isLoading: rejectLoading }] = useRejectVerificationMutation();
  
  const actionLoading = approveLoading || rejectLoading;

  const handleApprove = async (cognitoId: string) => {
    try {
      await approveVerification({
        cognitoId,
        adminNotes: adminNotes || undefined,
        userType: selectedUser?.userType || 'landlord' // Include user type in approval
      }).unwrap();

      setSelectedUser(null);
      setAdminNotes('');
      setError(null);
    } catch (error: any) {
      console.error('Approve error:', error);
      setError(error?.data?.message || 'Failed to approve verification');
    }
  };

  const handleReject = async (cognitoId: string) => {
    if (!adminNotes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      await rejectVerification({
        cognitoId,
        adminNotes,
        userType: selectedUser?.userType || 'landlord' // Include user type in rejection
      }).unwrap();

      setSelectedUser(null);
      setAdminNotes('');
      setError(null);
    } catch (error: any) {
      console.error('Reject error:', error);
      setError(error?.data?.message || 'Failed to reject verification');
    }
  };

  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  if (!isAdmin) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Access denied. Admin privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
          <p className="text-gray-600">Loading verifications...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load pending verifications. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Verification Management</span>
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'landlord' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('landlord')}
                >
                  Landlords
                </Button>
                <Button
                  variant={filterType === 'tenant' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('tenant')}
                >
                  Tenants
                </Button>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {filteredVerifications.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {pendingVerifications.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No pending verifications at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Landlord List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pending Verifications</h3>
                {filteredVerifications.map((user) => (
                  <Card 
                    key={user.cognitoId} 
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.cognitoId === user.cognitoId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">{user.name}</span>
                            <Badge className={`${
                              user.userType === 'landlord' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            } text-xs`}>
                              {user.userType.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{user.phoneNumber}</span>
                          </div>
                          {user.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span>{user.address}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {user.nidDocumentUrl && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              NID
                            </Badge>
                          )}
                          {user.userType === 'landlord' && user.addressProofUrl && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Address
                            </Badge>
                          )}
                          {user.userType === 'tenant' && user.selfieUrl && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              Selfie
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Verification Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Verification Details</h3>
                {selectedUser ? (
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      {/* User Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">{selectedUser.userType === 'landlord' ? 'Landlord' : 'Tenant'} Information</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div><span className="font-medium">Name:</span> {selectedUser.name}</div>
                          <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                          <div><span className="font-medium">Phone:</span> {selectedUser.phoneNumber}</div>
                          {selectedUser.nidNumber && (
                            <div><span className="font-medium">NID Number:</span> {selectedUser.nidNumber}</div>
                          )}
                          {selectedUser.address && (
                            <div><span className="font-medium">Address:</span> {selectedUser.address}</div>
                          )}
                          <div>
                            <span className="font-medium">User Type:</span>
                            <Badge className={`ml-2 ${selectedUser.userType === 'landlord' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {selectedUser.userType.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Uploaded Documents</h4>
                        <div className="space-y-2">
                          {selectedUser.nidDocumentUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(selectedUser.nidDocumentUrl!)}
                              className="w-full justify-start"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View National ID
                              <Eye className="w-4 h-4 ml-auto" />
                            </Button>
                          )}
                          {selectedUser.addressProofUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(selectedUser.addressProofUrl!)}
                              className="w-full justify-start"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Address Proof
                              <Eye className="w-4 h-4 ml-auto" />
                            </Button>
                          )}
                          {selectedUser.selfieUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDocument(selectedUser.selfieUrl!)}
                              className="w-full justify-start"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Selfie
                              <Eye className="w-4 h-4 ml-auto" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Admin Notes</h4>
                        <Textarea
                          placeholder="Add notes about this verification (required for rejection)..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="min-h-20"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApprove(selectedUser.cognitoId)}
                          disabled={actionLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {actionLoading ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleReject(selectedUser.cognitoId)}
                          disabled={actionLoading || !adminNotes.trim()}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {actionLoading ? 'Processing...' : 'Reject'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      Select a user from the list to view verification details
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVerificationManagement;