"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useGetAuthUserQuery, useUploadVerificationDocumentsMutation, useGetTenantVerificationStatusQuery, useWithdrawVerificationMutation } from "@/state/api";
import { toast } from "sonner";
import { fetchAuthSession } from "aws-amplify/auth";
import { useDropzone } from "react-dropzone";
import { CheckCircle, XCircle } from "lucide-react";
import { usePreviewVerificationDocumentsMutation } from "@/state/api";

export default function TenantVerificationForm() {
  const { data: authUser, isLoading: userLoading, error: userError } = useGetAuthUserQuery();
  const [uploadVerification, { isLoading }] = useUploadVerificationDocumentsMutation();
  const [previewDocuments, { isLoading: isPreviewing }] = usePreviewVerificationDocumentsMutation();
  
  // Session management state
  const [cachedSession, setCachedSession] = React.useState<any>(null);
  const [sessionFetchCount, setSessionFetchCount] = React.useState(0);
  
  // Form state - must be declared before any conditional returns
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<{
    name?: string;
    nidNumber?: string;
    address?: string;
    steps?: Array<any>;
    summary?: any;
  }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [confirmedName, setConfirmedName] = useState<string | undefined>(undefined);
  const [confirmedNid, setConfirmedNid] = useState<string | undefined>(undefined);
  const [confirmedAddress, setConfirmedAddress] = useState<string | undefined>(undefined);
  const [isConfirmedByUser, setIsConfirmedByUser] = useState(false);
  
  const cognitoId = authUser?.cognitoInfo?.userId;
  const { data: verificationStatus, refetch: refetchVerification } = useGetTenantVerificationStatusQuery(
    cognitoId || '', 
    { 
      skip: !cognitoId, 
      refetchOnMountOrArgChange: true,
      pollingInterval: 5000 // Poll every 5 seconds while the component is mounted
    }
  );
  const [withdrawVerification, { isLoading: isWithdrawing }] = useWithdrawVerificationMutation();

  // All hooks must be before any conditional returns
  const onNidFrontDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setNidFront(acceptedFiles[0]);
      setOcrError(null);
    }
  }, []);

  const onNidBackDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setNidBack(acceptedFiles[0]);
      setOcrError(null);
    }
  }, []);

  const onSelfieDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setSelfie(acceptedFiles[0]);
      setOcrError(null);
    }
  }, []);

  const nidFrontDropzone = useDropzone({ onDrop: onNidFrontDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, maxFiles: 1 });
  const nidBackDropzone = useDropzone({ onDrop: onNidBackDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, maxFiles: 1 });
  const selfieDropzone = useDropzone({ onDrop: onSelfieDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, maxFiles: 1 });

  // Debug logging with more detailed status information
  React.useEffect(() => {
    console.log('Raw verification status:', verificationStatus);
    if (verificationStatus) {
      const status = (
        verificationStatus.status || 
        verificationStatus.verificationStatus || 
        verificationStatus.nidStatus || 
        'NOT_SUBMITTED'
      ).toString().toUpperCase();
      console.log('Normalized verification status:', status);
      console.log('Status details:', {
        rawStatus: verificationStatus.status,
        verificationStatus: verificationStatus.verificationStatus,
        nidStatus: verificationStatus.nidStatus,
        normalized: status,
        isPending: ['PENDING', 'PENDING_REVIEW'].includes(status),
        isVerified: status === 'VERIFIED',
        sessionFetchCount
      });
    }
  }, [verificationStatus, sessionFetchCount]);

  // Clear session cache when needed
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setCachedSession(null);
    }, 55 * 60 * 1000); // Clear cache every 55 minutes (before the 1-hour expiry)
    
    return () => clearInterval(intervalId);
  }, []);

  if (userLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Loading...</CardContent>
      </Card>
    );
  }

  if (userError || !authUser?.cognitoInfo?.userId) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {authUser ? "Error loading user information. Please refresh." : "Please log in to continue."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handlePreview = async () => {
    setOcrError(null);
    if (!nidFront || !nidBack) {
      setOcrError('Please upload both NID front and back for preview');
      return;
    }

    setIsProcessingOcr(true);
    try {
      const formData = new FormData();
      formData.append('nidFront', nidFront as File);
      formData.append('nidBack', nidBack as File);
      if (selfie) formData.append('selfie', selfie as File);

      const result = await previewDocuments({ formData }).unwrap();
      setOcrData({
        name: result.name,
        nidNumber: result.nidNumber,
        address: result.address,
        steps: result.steps || [],
        summary: result.summary
      });
      // Prefill editable confirmation fields
      setConfirmedName(result.name || undefined);
      setConfirmedNid(result.nidNumber || undefined);
      setConfirmedAddress(result.address || undefined);
      setIsConfirmedByUser(false);
      setShowPreview(true);
    } catch (err: any) {
      console.error('OCR preview failed', err);
      setOcrError(err?.data?.message || err?.message || 'Failed to run OCR preview');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const getAuthSession = React.useCallback(async () => {
    try {
      if (cachedSession) {
        console.log(`Using cached session (fetch count: ${sessionFetchCount})`);
        return cachedSession;
      }
      
      setSessionFetchCount(prev => prev + 1);
      console.log(`Fetching new session (fetch count: ${sessionFetchCount + 1})`);
      
      const session = await fetchAuthSession();
      setCachedSession(session);
      return session;
    } catch (error) {
      console.error('Session fetch error:', error);
      throw error;
    }
  }, [cachedSession, sessionFetchCount]);

  const handleUpload = async () => {
    if (!nidFront || !nidBack || !selfie) {
      toast.error('Please provide NID front, NID back and a recent selfie before submitting.');
      return;
    }
    if (!isConfirmedByUser) {
      toast.error('Please confirm the extracted information before uploading.');
      return;
    }

    console.log('Starting upload process...');
    // Force fetch fresh verification status before proceeding
    let currentStatus;
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');
      const session = await getAuthSession();
      const { idToken } = session.tokens ?? {};
      const headers: Record<string,string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      
      console.log('Fetching fresh verification status...');
      const resp = await fetch(
        `${API_BASE}/verification/status/${cognitoId}?_=${Date.now()}`,
        { 
          method: 'GET',
          headers: {
            ...headers,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
          },
          credentials: 'include'
        }
      );
      
      if (resp.ok) {
        const data = await resp.json();
        currentStatus = data?.data || data;
        console.log('Fresh verification status:', currentStatus);
        
        const status = (
          currentStatus?.status || 
          currentStatus?.verificationStatus || 
          currentStatus?.nidStatus || 
          'NOT_SUBMITTED'
        ).toString().toUpperCase();
        
        if (['PENDING', 'PENDING_REVIEW', 'VERIFIED'].includes(status)) {
          console.log('Blocking upload - current status:', status);
          toast.error(
            status === 'VERIFIED' 
              ? 'Your account is already verified.'
              : 'You have a pending verification.',
            {
              duration: 6000,
              description: 'Please wait for the current review to complete.'
            }
          );
          // Refresh the UI state
          await refetchVerification?.();
          return;
        }
      } else {
        console.warn('Failed to fetch fresh status:', resp.status);
      }
    } catch (e) {
      console.warn('Error checking fresh verification status:', e);
    }

    try {
        const formData = new FormData();
      
      // Log file details before upload
      console.log('Uploading files with details:', {
        nidFront: { name: nidFront?.name, type: nidFront?.type, size: nidFront?.size },
        nidBack: { name: nidBack?.name, type: nidBack?.type, size: nidBack?.size },
        selfie: { name: selfie?.name, type: selfie?.type, size: selfie?.size }
      });

      // Append files with explicit content types
      formData.append('nidFront', nidFront as File, nidFront?.name);
      formData.append('nidBack', nidBack as File, nidBack?.name);
      formData.append('selfie', selfie as File, selfie?.name);

      // Append additional data
      if (confirmedName) formData.append('extractedName', confirmedName);
      if (confirmedNid) formData.append('extractedNidNumber', confirmedNid);
      if (confirmedAddress) formData.append('extractedAddress', confirmedAddress);

      // Log FormData contents
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]);
      }
      // Re-fetch latest status from server right before upload to avoid stale state/race
      let latest = verificationStatus;
      try {
        const fresh = await refetchVerification?.();
        // RTK Query refetch returns an object where `.data` holds the response when successful
        if (fresh && (fresh as any).data) {
          latest = (fresh as any).data;
        }
      } catch (e) {
        // ignore refetch errors and fall back to cached value
      }
      // If RTK refetch did not return fresh data (race or skip), fall back to a direct fetch to the backend
      if (!latest || !latest.status) {
        try {
          const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const headers: Record<string,string> = { 'Content-Type': 'application/json' };
          if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
          const url = `${API_BASE}/verification/status/${cognitoId}?_=${Date.now()}`;
          const fetchHeaders = { ...headers, 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
          const resp = await fetch(url, { method: 'GET', headers: fetchHeaders, credentials: 'include' });
          if (resp.ok) {
            const json = await resp.json();
            latest = json?.data ?? json;
          } else {
            try { const json = await resp.json(); latest = json?.data ?? json; } catch { /* ignore */ }
          }
        } catch (e) {
          // ignore; we'll use cached value below
          console.warn('Fallback fetch for verification status failed', e);
        }
      }
      const status = (latest?.status || latest?.verificationStatus || latest?.nidStatus || 'not_submitted').toString().toUpperCase();
      
      // Normalize the status check
      if (['PENDING', 'PENDING_REVIEW', 'VERIFIED'].includes(status)) {
        const message = status === 'VERIFIED' 
          ? 'Your account is already verified. You cannot re-upload documents.' 
          : 'You have a pending verification. Please wait for the review to complete.';
        toast.error(message, {
          duration: 6000,
          description: 'Contact support if you need to modify your submission.'
        });
        return;
      }

      await uploadVerification({ cognitoId: authUser.cognitoInfo.userId, formData }).unwrap();
      toast.success('Verification documents uploaded successfully.');
      try { await refetchVerification?.(); } catch {}
      // reset
      setNidFront(null);
      setNidBack(null);
      setSelfie(null);
      setShowPreview(false);
      setOcrData({});
    } catch (err: any) {
      // RTK Query / fetch errors can have several shapes. Try to extract a useful message.
      console.error('Upload failed - full error object:', err);
      console.error('Upload failed - err.data:', err?.data);
      console.error('Upload failed - err.error:', err?.error);
      console.error('Upload failed - err.message:', err?.message);
      console.error('Upload failed - err.status:', err?.status);
      try { 
        console.error('Upload failed - stringified error:', JSON.stringify(err, null, 2));
      } catch(e) {
        console.error('Could not stringify error:', e);
      }

      let message = 'Failed to upload verification documents. Please try again or contact support.';

      if (!err) {
        // fall back to generic message
      } else if (typeof err === 'string') {
        message = err;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      } else if (err?.data) {
        // fetchBaseQuery / server responses often return { data: { message } }
        if (typeof err.data === 'string') message = err.data;
        else if (err.data.message) message = err.data.message;
        else message = JSON.stringify(err.data);
      } else if (err?.error) {
        // Fetch base query may return { error: '...' }
        message = err.error;
      } else if (err?.status === 409 && err?.data?.message?.includes('pending')) {
        message = 'You already have a pending verification. Please wait for the review to complete or contact support if you need to modify your submission.';
      } else if (err?.status) {
        message = `Request failed (status: ${String(err.status)})`;
      }

      toast.error(message, {
        duration: 6000,
        description: err?.status === 409 ? 'Your documents are already under review.' : undefined
      });
    }
  };

  // Check if verification is in a state that should disable the form
  const isVerificationInProgress = React.useMemo(() => {
    if (!verificationStatus) return false;
    
    // Normalize the status by checking all possible fields
    const status = (
      verificationStatus.status || 
      verificationStatus.verificationStatus || 
      verificationStatus.nidStatus || 
      'NOT_SUBMITTED'
    ).toString().toUpperCase();
    
    // Log the status check
    console.log('Verification status check:', {
      raw: verificationStatus,
      normalized: status,
      fields: {
        status: verificationStatus.status,
        verificationStatus: verificationStatus.verificationStatus,
        nidStatus: verificationStatus.nidStatus
      },
      isPending: ['PENDING', 'PENDING_REVIEW'].includes(status),
      isVerified: status === 'VERIFIED'
    });
    
    return ['PENDING', 'PENDING_REVIEW', 'VERIFIED'].includes(status);
  }, [verificationStatus]);

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Verification status banner */}
        {verificationStatus && (
          <div className={`p-3 rounded-md ${
            verificationStatus.status === 'verified' || verificationStatus.verificationStatus === 'VERIFIED' ? 
              'bg-green-100 border border-green-200' : 
            (verificationStatus.status === 'pending' || verificationStatus.verificationStatus === 'PENDING' || verificationStatus.nidStatus === 'PENDING') ? 
              'bg-yellow-50 border border-yellow-200' : 
            'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Verification status: <span className="font-semibold">
                    {(() => {
                      const status = (
                        verificationStatus.status || 
                        verificationStatus.verificationStatus || 
                        verificationStatus.nidStatus || 
                        'NOT_SUBMITTED'
                      ).toString().toUpperCase();
                      
                      // Normalize status display
                      if (status === 'PENDING' || status === 'PENDING_REVIEW') return 'PENDING';
                      if (status === 'VERIFIED') return 'VERIFIED';
                      if (status === 'REJECTED') return 'REJECTED';
                      return 'NOT SUBMITTED';
                    })()}
                  </span>
                </div>
                {(verificationStatus.status === 'pending' || 
                  verificationStatus.verificationStatus === 'PENDING' || 
                  verificationStatus.nidStatus === 'PENDING') && 
                  <div className="text-xs text-gray-600">Your documents are submitted and awaiting review. You cannot re-upload until review is complete.</div>
                }
                {(verificationStatus.status === 'verified' || 
                  verificationStatus.verificationStatus === 'VERIFIED') && 
                  <div className="text-xs text-gray-600">Your identity has been verified.</div>
                }
                {verificationStatus.status === 'rejected' && 
                  <div className="text-xs text-gray-600">Your submission was rejected. You may withdraw the submission and resubmit corrected documents.</div>
                }
                {(!verificationStatus.status && 
                  !verificationStatus.verificationStatus && 
                  !verificationStatus.nidStatus) && 
                  <div className="text-xs text-gray-600">No verification documents submitted yet.</div>
                }
              </div>
              {verificationStatus.status === 'rejected' && (
                <div>
                  <button
                    className="inline-flex items-center px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
                    onClick={async () => {
                      const ok = confirm('Withdraw rejected submission? This will reset your verification status so you can resubmit.');
                      if (!ok) return;
                      try {
                        await withdrawVerification({ cognitoId: cognitoId! }).unwrap();
                        toast.success('Submission withdrawn. You can now resubmit.');
                        try { await refetchVerification?.(); } catch {}
                      } catch (e: any) {
                        console.error('Withdraw failed', e);
                        toast.error(e?.data?.message || e?.message || 'Failed to withdraw submission');
                      }
                    }}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw & Resubmit'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">NID Front</label>
            <div
              {...(isVerificationInProgress ? {} : nidFrontDropzone.getRootProps())}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                nidFront ? 'border-green-500 bg-green-50' : 
                isVerificationInProgress ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 
                'border-gray-300 hover:border-gray-400 cursor-pointer'
              }`}
            >
              {!isVerificationInProgress && <input {...nidFrontDropzone.getInputProps()} />}
              {nidFront ? (
                <div className="text-sm">
                  <p className="font-medium">{nidFront.name}</p>
                  <p className="text-xs text-gray-500">{(nidFront.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <p className={`text-sm ${isVerificationInProgress ? 'text-gray-400' : ''}`}>
                  {isVerificationInProgress ? 'File upload disabled' : 'Drag & drop front side or click to select (PNG/JPG)'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">NID Back</label>
            <div
              {...(isVerificationInProgress ? {} : nidBackDropzone.getRootProps())}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                nidBack ? 'border-green-500 bg-green-50' : 
                isVerificationInProgress ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 
                'border-gray-300 hover:border-gray-400 cursor-pointer'
              }`}
            >
              {!isVerificationInProgress && <input {...nidBackDropzone.getInputProps()} />}
              {nidBack ? (
                <div className="text-sm">
                  <p className="font-medium">{nidBack.name}</p>
                  <p className="text-xs text-gray-500">{(nidBack.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <p className={`text-sm ${isVerificationInProgress ? 'text-gray-400' : ''}`}>
                  {isVerificationInProgress ? 'File upload disabled' : 'Drag & drop back side or click to select (PNG/JPG)'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Recent Photograph (Selfie)</label>
            <div
              {...(isVerificationInProgress ? {} : selfieDropzone.getRootProps())}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                selfie ? 'border-green-500 bg-green-50' : 
                isVerificationInProgress ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 
                'border-gray-300 hover:border-gray-400 cursor-pointer'
              }`}
            >
              {!isVerificationInProgress && <input {...selfieDropzone.getInputProps()} />}
              {selfie ? (
                <div className="text-sm">
                  <p className="font-medium">{selfie.name}</p>
                  <p className="text-xs text-gray-500">{(selfie.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <p className={`text-sm ${isVerificationInProgress ? 'text-gray-400' : ''}`}>
                  {isVerificationInProgress ? 'File upload disabled' : 'Drag & drop a recent photo or click to select'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* OCR Preview and errors */}
        {ocrError && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{ocrError}</AlertDescription>
          </Alert>
        )}

        {showPreview && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-blue-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> OCR Preview</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Name (editable)</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
                    value={confirmedName ?? ''}
                    onChange={(e) => setConfirmedName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">NID Number (editable)</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
                    value={confirmedNid ?? ''}
                    onChange={(e) => setConfirmedNid(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Address (editable)</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border px-2 py-1 text-sm"
                    value={confirmedAddress ?? ''}
                    onChange={(e) => setConfirmedAddress(e.target.value)}
                  />
                </div>
              </div>
              {ocrData.summary && (
                <p className="text-xs text-gray-600">OCR Summary: {JSON.stringify(ocrData.summary)}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <input id="confirm-ocr" type="checkbox" checked={isConfirmedByUser} onChange={(e) => setIsConfirmedByUser(e.target.checked)} />
                <label htmlFor="confirm-ocr" className="text-sm text-gray-700">I confirm the above information is correct (or manually edited)</label>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button 
            onClick={handlePreview} 
            disabled={isProcessingOcr || isPreviewing || isVerificationInProgress} 
            variant="outline"
          >
            {isProcessingOcr || isPreviewing ? 'Processing...' : 'Preview OCR'}
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isLoading || !isConfirmedByUser || isVerificationInProgress}
          >
            {isLoading ? 'Uploading...' : 'Confirm & Submit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}