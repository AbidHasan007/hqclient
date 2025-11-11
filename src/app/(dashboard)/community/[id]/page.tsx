"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageSquare, Users, AlertTriangle, Star, User, Send, Activity, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { 
  useGetCommunityPostQuery, 
  useGetPostCommentsQuery, 
  useCreateCommentMutation,
  useGetAuthUserQuery,
  useGetVerificationStatusQuery
} from '@/state/api';
import TenantActivityModal from '@/components/TenantActivityModal';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    cognitoId: string;
    name: string;
    trustScore: number;
    verificationStatus: string;
    selfieUrl?: string;
  };
}

interface Post {
  id: string;
  content: string;
  type: 'REQUESTING' | 'OFFERING';
  createdAt: string;
  author: {
    id: number;
    cognitoId: string;
    name: string;
    trustScore: number;
    verificationStatus: string;
    selfieUrl?: string;
  };
  lease: {
    id: number;
    startDate: string;
    rent: number;
    property: {
      id: number;
      name: string;
      location: {
        city: string;
        address: string;
        area: string;
      };
    };
  };
  comments: Comment[];
}

const PostDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [newComment, setNewComment] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // RTK Query hooks
  const { data: auth } = useGetAuthUserQuery();
  const cognitoId = auth?.cognitoInfo?.userId;
  const { data: verification } = useGetVerificationStatusQuery(cognitoId!, { skip: !cognitoId });
  const { 
    data: postData, 
    error: postError, 
    isLoading: isLoadingPost 
  } = useGetCommunityPostQuery(params.id as string);

  const { 
    data: commentsResponse, 
    isLoading: isLoadingComments 
  } = useGetPostCommentsQuery(params.id as string);

  // Normalize commentsResponse which may be either an array or an envelope { success, data }
  const comments: Comment[] = Array.isArray(commentsResponse)
    ? commentsResponse
    : (commentsResponse && (commentsResponse as any).data) || [];

  const [createComment, { isLoading: isSubmittingComment }] = useCreateCommentMutation();

  const post = postData?.data;

    const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      await createComment({
        postId: params.id as string,
        content: newComment
      }).unwrap();
      
      setNewComment('');
      // RTK Query will automatically refetch the comments
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Handle errors
  useEffect(() => {
    if (postError) {
      toast.error('Failed to load post');
      router.push('/community');
    }
  }, [postError, router]);

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'REQUESTING': return <Users className="h-4 w-4 text-blue-500" />;
      case 'OFFERING': return <Home className="h-4 w-4 text-green-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'REQUESTING': return 'default';
      case 'OFFERING': return 'secondary';
      default: return 'outline';
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'REQUESTING': return 'Looking for Roommate';
      case 'OFFERING': return 'Have Space Available';
      default: return type;
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewActivity = (cognitoId: string) => {
    setSelectedTenantId(cognitoId);
    setIsActivityModalOpen(true);
  };

  if (isLoadingPost) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!verification || verification.nidStatus !== 'VERIFIED') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Required</h3>
            <p className="text-gray-600 mb-4">Verify your identity to view and comment on posts.</p>
            <Button onClick={() => router.push('/tenants/verify')}>
              Go to Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Post not found</h3>
            <p className="text-gray-600 mb-4">This post may have been deleted or doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/community')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Community
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push('/community')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Post Details</h1>
      </div>

      {/* Main Post */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                {post.author.selfieUrl ? (
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image 
                      src={post.author.selfieUrl} 
                      alt={post.author.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                {post.author.verificationStatus === 'verified' && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <Star className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-lg">{post.author.name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Trust Score: </span>
                  <span className={`font-medium ${getTrustScoreColor(post.author.trustScore)}`}>
                    {post.author.trustScore}
                  </span>
                  {post.author.verificationStatus === 'verified' && (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs text-teal-600 hover:text-teal-700 px-2"
                  onClick={() => handleViewActivity(post.author.cognitoId)}
                >
                  <Activity className="h-3 w-3 mr-1" />
                  View Activity
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getPostTypeColor(post.type) as any} className="flex items-center gap-1">
                {getPostTypeIcon(post.type)}
                {getPostTypeLabel(post.type)}
              </Badge>
            </div>
          </div>

          {/* Property Information */}
          {post.lease && post.lease.property && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <Home className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{post.lease.property.name}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{post.lease.property.location.area}, {post.lease.property.location.city}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      Rent: <span className="font-semibold text-gray-900">৳{post.lease.rent.toLocaleString()}/mo</span>
                    </span>
                    <span className="text-gray-500">
                      Living since {new Date(post.lease.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>Posted on {new Date(post.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed">{post.content}</p>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({post.comments.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Add Comment Form */}
          <div className="border-b pb-4">
            <Textarea
              placeholder="Add your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <Button 
              onClick={handleAddComment}
              disabled={isSubmittingComment || !newComment.trim()}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmittingComment ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>

          {/* Comments List */}
          {post.comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments && Array.isArray(comments) ? 
               comments.map((comment: any) => (
                <div key={comment.id} className="border-l-4 border-gray-200 pl-4 hover:border-teal-400 transition-colors">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="relative flex-shrink-0">
                      {comment.author.selfieUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                          <Image 
                            src={comment.author.selfieUrl} 
                            alt={comment.author.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                      {comment.author.verificationStatus === 'verified' && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                          <Star className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h5 className="font-medium text-gray-900">{comment.author.name}</h5>
                        <span className={`text-sm font-medium ${getTrustScoreColor(comment.author.trustScore)}`}>
                          ({comment.author.trustScore})
                        </span>
                        {comment.author.verificationStatus === 'verified' && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-teal-600 hover:text-teal-700 px-2 ml-auto"
                          onClick={() => handleViewActivity(comment.author.cognitoId)}
                        >
                          <Activity className="h-3 w-3 mr-1" />
                          Activity
                        </Button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              )):null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Activity Modal */}
      {selectedTenantId && (
        <TenantActivityModal
          tenantId={selectedTenantId}
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false);
            setSelectedTenantId(null);
          }}
        />
      )}
    </div>
  );
};

export default PostDetailPage;