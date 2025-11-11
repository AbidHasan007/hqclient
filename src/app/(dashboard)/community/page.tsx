"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Users, AlertTriangle, Star, Plus, Heart, User, Activity, Home, MapPin, UserPlus, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { 
  useGetCommunityPostsQuery, 
  useCreateCommunityPostMutation,
  useGetAuthUserQuery,
  useGetVerificationStatusQuery,
  useSendBookingRequestMutation,
  useGetConnectionStatusQuery
} from '@/state/api';
import TenantActivityModal from '@/components/TenantActivityModal';

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
  _count: {
    comments: number;
  };
}

const CommunityPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'REQUESTING' | 'OFFERING'>('REQUESTING');
  const [availableSeats, setAvailableSeats] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // RTK Query hooks
  const { data: auth } = useGetAuthUserQuery();
  const cognitoId = auth?.cognitoInfo?.userId;
  const { data: verification } = useGetVerificationStatusQuery(cognitoId!, { skip: !cognitoId });
  const { 
    data: postsData, 
    error, 
    isLoading, 
    refetch 
  } = useGetCommunityPostsQuery({
    page,
    limit: 10,
    type: activeTab !== 'all' ? activeTab : undefined
  });

  const [createPost, { isLoading: isCreating }] = useCreateCommunityPostMutation();
  const [sendBookingRequest] = useSendBookingRequestMutation();

  const posts = postsData?.data?.posts || [];
  const hasMore = postsData?.data?.pagination 
    ? postsData.data.pagination.page < postsData.data.pagination.pages 
    : false;

  // Book Seat Button Component
  const BookSeatButton = ({ authorCognitoId, availableSeats }: { authorCognitoId: string; availableSeats: number }) => {
    const { data: connectionData, isLoading: isLoadingConnection } = useGetConnectionStatusQuery(
      authorCognitoId,
      { skip: !cognitoId || authorCognitoId === cognitoId }
    );

    // Don't show button for own posts
    if (!cognitoId || authorCognitoId === cognitoId) {
      return null;
    }

    const handleBookSeat = async () => {
      try {
        await sendBookingRequest({ receiverCognitoId: authorCognitoId }).unwrap();
      } catch (error) {
        console.error('Error sending booking request:', error);
      }
    };

    if (isLoadingConnection) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    const connectionStatus = connectionData?.data?.status;

    if (connectionStatus === 'accepted') {
      return (
        <Button variant="default" size="sm" disabled className="bg-green-600 text-black">
          <CheckCircle className="h-4 w-4 mr-2" />
          Connected
        </Button>
      );
    }

    if (connectionStatus === 'pending') {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="h-4 w-4 mr-2" />
          Request Pending
        </Button>
      );
    }

    // Disable if no seats available
    if (availableSeats <= 0) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Users className="h-4 w-4 mr-2" />
          Seats Full
        </Button>
      );
    }

    return (
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleBookSeat}
        className="bg-teal-600 hover:bg-teal-700"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Book Seat
      </Button>
    );
  };

    // Create new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Please enter post content');
      return;
    }

    try {
      await createPost({
        content: newPostContent,
        type: newPostType,
        availableSeats
      }).unwrap();

      setNewPostContent('');
      setNewPostType('REQUESTING');
      setAvailableSeats(1);
      setIsDialogOpen(false);
      // No need to manually update posts - RTK Query will refetch automatically
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  useEffect(() => {
    setPage(1);
    refetch();
  }, [activeTab, refetch]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roommate Finder</h1>
          <p className="text-gray-600 mt-1">Find compatible roommates in your rental property</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/community/preferences">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Preferences
            </Button>
          </Link>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700"
                disabled={!verification || verification.nidStatus !== 'VERIFIED'}
                title={!verification || verification.status !== 'APPROVED' ? 'Verify your identity to post' : ''}
              >
                <Plus className="h-4 w-4 mr-2" />
                Find Roommate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Find a Roommate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={newPostType} onValueChange={(value: any) => setNewPostType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="What are you looking for?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REQUESTING">👥 Requesting Roommate</SelectItem>
                    <SelectItem value="OFFERING">🏠 Offering a Seat</SelectItem>
                  </SelectContent>
                </Select>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    How many roommates are you looking for?
                  </label>
                  <Select value={availableSeats.toString()} onValueChange={(value) => setAvailableSeats(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Roommate</SelectItem>
                      <SelectItem value="2">2 Roommates</SelectItem>
                      <SelectItem value="3">3 Roommates</SelectItem>
                      <SelectItem value="4">4 Roommates</SelectItem>
                      <SelectItem value="5">5 Roommates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Textarea
                  placeholder="Describe what you're looking for or offering... (Your active lease property will be automatically attached)"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[120px]"
                />
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost}>
                    Post
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="REQUESTING">Requesting Roommate</TabsTrigger>
          <TabsTrigger value="OFFERING">Offering a Seat</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Verification banner for unverified tenants */}
      {verification && verification.nidStatus !== 'VERIFIED' && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="text-amber-800">
              Verify your identity to find roommates in your active lease property.
            </div>
            <Link href="/tenants/verify" className="ml-4">
  <Button variant="outline">Go to Verification</Button>
</Link>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {(!verification || verification.nidStatus !== 'VERIFIED') ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Required</h3>
              <p className="text-gray-600 mb-4">Verify your identity to find roommates.</p>
              <Link href="/tenants/verify">
               <Button>Verify Now</Button>
               </Link>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No roommate posts yet</h3>
              <p className="text-gray-600 mb-4">Be the first to find a roommate in your property!</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      {post.author.selfieUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                          <Image 
                            src={post.author.selfieUrl} 
                            alt={post.author.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      {post.author.verificationStatus === 'verified' && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-black">
                      <h4 className="font-medium text-gray-900">{post.author.name}</h4>
                      <BookSeatButton authorCognitoId={post.author.cognitoId} availableSeats={post.availableSeats || 0} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Trust Score: </span>
                        <span className={`font-medium ${getTrustScoreColor(post.author.trustScore)}`}>
                          {post.author.trustScore}
                        </span>
                        {post.author.verificationStatus === 'verified' && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.availableSeats !== undefined && (
                      <Badge 
                        variant={post.availableSeats > 0 ? "outline" : "secondary"} 
                        className={`flex items-center gap-1 ${post.availableSeats > 0 ? 'border-green-500 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                      >
                        <Users className="h-3 w-3" />
                        {post.availableSeats} {post.availableSeats === 1 ? 'seat' : 'seats'} available
                      </Badge>
                    )}
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
                          <span>{post.lease.property.location.address}, {post.lease.property.location.city}</span>
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
              
              <CardContent className="pt-0">
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Link href={`/community/${post.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {post._count.comments} {post._count.comments === 1 ? 'Comment' : 'Comments'}
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-600 hover:text-teal-600"
                      onClick={() => handleViewActivity(post.author.cognitoId)}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      View Activity
                    </Button>
                  </div>
                  
                  <span className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && posts.length > 0 && (
        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
            }}
          >
            Load More Posts
          </Button>
        </div>
      )}

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

export default CommunityPage;