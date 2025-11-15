import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import { Admin, Application, Landlord, Lease, Payment, Property, Tenant } from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { getProperties } from "aws-amplify/storage";
import { number } from "zod";
import { FiltersState } from ".";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
    credentials: 'include',
    mode: 'cors',
    prepareHeaders : async (headers, { getState, extra, endpoint, type, forced }) => {
      try {
        const session = await fetchAuthSession();
        console.log('Session:', session); // Debug log
        const {idToken} = session.tokens ?? {};
        if( idToken ){
          headers.set("Authorization", `Bearer ${idToken}`);
        }
        
        // Only set Content-Type for non-FormData requests
        // FormData requests should let the browser set multipart/form-data with boundary
        if (endpoint !== 'createProperty' && endpoint !== 'uploadVerificationDocuments' && endpoint !== 'previewVerificationDocuments') {
          headers.set('Content-Type', 'application/json');
        }
        
        return headers;
      } catch (error) {
        console.error("Error preparing headers:", error);
        return headers;
      }
    }
  }),
  reducerPath: "api",
  tagTypes: ["Landlords", "Tenants", "Admins","Properties","PropertyDetails","Leases","Payments","Applications","SafetyIndicators","Verification","Users","Posts","Comments","RoommateMatches","RoommateRequests","RoommatePreference"],
  // Consider adding "Reviews" tag in future for targeted invalidation
  endpoints: (build) => ({
    
      // reviews
createReview: build.mutation<
  any,
  {
    leaseId: number;
    locationId: number;
    rating: number;
    comment?: string;
    type: "TENANT_TO_LANDLORD" | "LANDLORD_TO_TENANT";
  }
>({
  query: (body) => ({
    url: `reviews`,
    method: "POST",
    body,
  }),
  async onQueryStarted(_, { queryFulfilled }) {
    try {
      await withToast(queryFulfilled, {
        success: "Review submitted!",
        error: "Failed to submit review.",
      });
    } catch {}
  },
}),             
// export const createReview = async (req: Request, res: Response) => {
//   try {
//     const userRole = req.user.role; // from authMiddleware
//     const userId = req.user.cognitoId;
//     const { leaseId, rating, comment, type } = req.body;

//     // Validate input
//     if (!leaseId || !rating || !type) {
//       return res.status(400).json({ message: "leaseId, rating, and type are required" });
//     }

//     // Fetch lease to confirm user involvement
//     const lease = await prisma.lease.findUnique({
//       where: { id: leaseId },
//       include: { property: true },
//     });

//     if (!lease) return res.status(404).json({ message: "Lease not found" });

//     // Check if user is authorized to review this lease
//     if (userRole === "tenant" && lease.tenantCognitoId !== userId) {
//       return res.status(403).json({ message: "You can only review leases you belong to" });
//     }

//     if (userRole === "landlord" && lease.property.landlordCognitoId !== userId) {
//       return res.status(403).json({ message: "You can only review tenants of your properties" });
//     }

//     // Determine reviewType automatically if not sent
//     const reviewType =
//       type || (userRole === "tenant" ? "TENANT_TO_LANDLORD" : "LANDLORD_TO_TENANT");

//     // Create review
//     const review = await prisma.review.create({
//       data: {
//         leaseId,
//         rating,
//         comment,
//         type: reviewType,
//         tenantId: lease.tenantCognitoId,
//         landlordId: lease.property.landlordCognitoId,
//         locationId: lease.property.locationId,
//       },
//     });

//     res.status(201).json(review);
//   } catch (err: any) {
//     console.error("Error creating review:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };                      

getReviews: build.query<any[], { propertyId?: number; type?: string; userId?: string }>({
  // backend endpoint example: /reviews?userId=abc&type=TENANT_TO_LANDLORD&propertyId=12
  query: (params) => {
    const queryParams = new URLSearchParams();
    if (params.propertyId) queryParams.append("propertyId", params.propertyId.toString());
    if (params.type) queryParams.append("type", params.type);
    if (params.userId) queryParams.append("userId", params.userId);
    return `reviews?${queryParams.toString()}`;
  },
}),

     
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraOptions, fetchWithBQ) => {
        try{
          const session = await fetchAuthSession();
          console.log("Session:", session);
          const {idToken} = session.tokens ?? {};
          
          // Check if we have a valid session before calling getCurrentUser
          if (!session.tokens?.idToken) {
            return {error: "No valid authentication session found"}
          }
          
          let user;
          try {
            user = await getCurrentUser();
          } catch (authError) {
            console.error("Authentication error:", authError);
            return {error: "User not authenticated"}
          }
          // Prefer custom:role, but fall back to Cognito groups claim if available
          let userRole = (idToken?.payload["custom:role"] as string) || "";
          if (!userRole) {
            const groups = idToken?.payload["cognito:groups"] || idToken?.payload["Cognito:groups"] || idToken?.payload["cognito_groups"];
            if (Array.isArray(groups) && groups.length > 0) {
              const g = groups.map((s: any) => String(s).toLowerCase());
              if (g.includes('admin') || g.includes('admins')) userRole = 'admin';
              else if (g.includes('landlord') || g.includes('landlords')) userRole = 'landlord';
              else if (g.includes('tenant') || g.includes('tenants')) userRole = 'tenant';
              else userRole = g[0];
            }
          }

          if (!userRole) {
            return {error: "User role not found in token"}
          }

          const endpoint =
                        userRole === "admin" ? `/admins/${user.userId}` :
                        userRole === "landlord" ? `/landlords/${user.userId}` :
                        `/tenants/${user.userId}`;
                      
          
          let userDetailsResponse = await fetchWithBQ(endpoint);
          console.log("User Details Response:", userDetailsResponse);

          // User should already exist in database after proper signup
          if (userDetailsResponse.error) {
            if (userDetailsResponse.error.status === 404) {
              // Auto-create missing user profile from Cognito data
              console.log("User not found in database, creating profile from Cognito data");
              try {
                const userName = idToken?.payload["given_name"] as string || idToken?.payload["name"] as string || "User";
                const userEmail = idToken?.payload["email"] as string;
                const userPhone = idToken?.payload["phone_number"] as string;
                const userGender = idToken?.payload["custom:gender"] as string || "male";
                console.log("Creating user profile with role:", userRole);
                const createEndpoint = 
                  userRole === "landlord" ? "/landlords/create" : 
                  userRole === "admin" ? "/admins/create" :
                  "/tenants/create";
                
                const createBody = {
                  cognitoId: user.userId,
                  name: userName,
                  email: userEmail,
                  phoneNumber: userPhone,
                  ...(userRole !== "admin" ? { gender: userGender } : {})
                };
                
                console.log("Creating user with data:", createBody);
                
                const createResponse = await fetchWithBQ({
                  url: createEndpoint,
                  method: "POST",
                  body: createBody
                });

                if (createResponse.error) {
                  const errorData = createResponse.error.data;
                  console.log("Create response error details:", {
                    error: createResponse.error,
                    data: errorData,
                    status: createResponse.error.status
                  });
                  
                  // Check if this is a duplicate email error
                  const isEmailFieldError =
                    createResponse.error.status === 400 &&
                    errorData && typeof errorData === 'object' && 
                    'field' in errorData && errorData.field === "email";
                  
                  if (isEmailFieldError) {
                    console.log("Email exists, trying to update cognitoId");
                    const updateEndpoint = 
                      userRole === "landlord" ? "/landlords/update-cognito-id" : 
                      userRole === "admin" ? "/admins/update-cognito-id" :
                      "/tenants/update-cognito-id";
                    
                    const updateResponse = await fetchWithBQ({
                      url: updateEndpoint,
                      method: "PUT",
                      body: {
                        email: userEmail,
                        newCognitoId: user.userId
                      }
                    });
                    
                    if (updateResponse.error) {
                      console.error("Update failed:", updateResponse.error);
                      return {error: `Failed to update ${userRole} profile with new ID`};
                    }
                  } else {
                    console.error("Creation failed:", createResponse.error);
                    return {error: `Failed to create ${userRole} profile`};
                  }
                }

                // Fetch the final user state
                userDetailsResponse = await fetchWithBQ(endpoint);
                if (userDetailsResponse.error) {
                  console.error("Failed to fetch created user:", userDetailsResponse.error);
                  return {error: "Failed to verify user creation"};
                }
              } catch (error) {
                console.error("Profile creation error:", error);
                return {error: `Failed to set up ${userRole} profile`};
              }
            } else {
            return {error: userDetailsResponse.error}
            }
          }

          return {
            data:{
              cognitoInfo: {...user},
              userInfo: userDetailsResponse.data as Tenant | Landlord | Admin,
              userRole,
            },
          };

        } catch(error:any){
            console.error("Error in getAuthUser:", error);
            return {error: error.message || "Could not fetch user data"}
        }
      }
    }),
    // landlord related endpoints
    getLandlord: build.query<Landlord, string>({
      query: (cognitoId) => `landlords/${cognitoId}`,
      providesTags: (result) => {
        const tags: Array<{ type: "Landlords"; id: string | number }> = [];
        if (result?.id) {
          tags.push({ type: "Landlords", id: result.id });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            error: "Failed to load landlord profile.",
          });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),
    
    getLandlordProperties: build.query<Property[], string>({
      query: (cognitoId) => `landlords/${cognitoId}/properties`,
      providesTags: (result, error, cognitoId) => {
        const tags: Array<{ type: "Properties"; id: string | number }> = [
          { type: "Properties", id: "LIST" },
          { type: "Properties", id: `LANDLORD_${cognitoId}` }
        ];
        if (result && Array.isArray(result)) {
          result.forEach((property) => {
            if (property?.id) {
              tags.push({ type: "Properties", id: property.id });
            }
          });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
            error: "Failed to load landlord properties.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }), 
     createProperty: build.mutation<Property, FormData>({
      query: (newProperty) => ({
        url: `properties`,
        method: "POST",
        body: newProperty,
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Properties" | "Landlords"; id: string | number }> = [
          { type: "Properties", id: "LIST" }
        ];
        if (result?.landlord?.id) {
          tags.push({ type: "Landlords", id: result.landlord.id });
        }
        if (result?.landlordCognitoId) {
          tags.push({ type: "Properties", id: `LANDLORD_${result.landlordCognitoId}` });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),
    
    deleteProperty: build.mutation<{ message: string; success: boolean }, number>({
      query: (propertyId) => ({
        url: `properties/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, propertyId) => [
        { type: "Properties", id: "LIST" },
        { type: "Properties", id: propertyId },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Property deleted successfully!",
            error: "Failed to delete property.",
          });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),
    
    updateLandlordSettings: build.mutation <Landlord,{congnitoId:string} & Partial<Landlord>>({
      query: ({cognitoId, ...updatedLandlord})=>({
        url: `/landlords/${cognitoId}`,
        method: "PUT",
        body: updatedLandlord
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Landlords"; id: string | number }> = [];
        if (result?.id) {
          tags.push({ type: "Landlords", id: result.id });
        }
        return tags;
      }
    }),
    // end of manager related endpoints

    updateAdminSettings: build.mutation <Admin,{congnitoId:string} & Partial<Admin>>({
      query: ({cognitoId, ...updatedAdmin})=>({
        url: `/admins/${cognitoId}`,
        method: "PUT",
        body: updatedAdmin
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Admins"; id: string | number }> = [];
        if (result?.id) {
          tags.push({ type: "Admins", id: result.id });
        }
        return tags;
      }
    }),
    getProperties: build.query<Property[], Partial<FiltersState> & {favoriteIds?: number[]}>({
        query: (filters) => {
        const params = cleanParams({
          location: filters.location,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: filters.amenities?.join(","),
          availableFrom: filters.availableFrom && filters.availableFrom !== "any" 
            ? ((() => {
                try {
                  const date = new Date(filters.availableFrom);
                  return !isNaN(date.getTime()) ? filters.availableFrom : undefined;
                } catch {
                  console.error('Invalid availableFrom date:', filters.availableFrom);
                  return undefined;
                }
              })()) 
            : undefined,
          favoriteIds: filters.favoriteIds?.join(","),
          latitude: filters.coordinates && filters.coordinates.length === 2 && filters.coordinates[1] !== 0 && !isNaN(filters.coordinates[1]) ? filters.coordinates[1] : undefined,
          longitude: filters.coordinates && filters.coordinates.length === 2 && filters.coordinates[0] !== 0 && !isNaN(filters.coordinates[0]) ? filters.coordinates[0] : undefined,
          radius: filters.radius,
          boundsNorth: filters.bounds?.north,
          boundsSouth: filters.bounds?.south,
          boundsEast: filters.bounds?.east,
          boundsWest: filters.bounds?.west,
        });

        console.log('API Query Parameters:', params);
        console.log('Original filters coordinates:', filters.coordinates);
        console.log('CleanParams result for coordinates:', cleanParams({ coordinates: filters.coordinates }));

        return { url: "properties", params };
      },
      providesTags: (result) => {
        const tags: Array<{ type: "Properties"; id: string | number }> = [
          { type: "Properties", id: "LIST" }
        ];
        if (result && Array.isArray(result)) {
          result.forEach((property) => {
            if (property?.id) {
              tags.push({ type: "Properties", id: property.id });
            }
          });
        }
        return tags;
      },
    }),
    getProperty: build.query<Property, number>({
      query: (id) => `properties/${id}`,
      providesTags: (result,error, id) => [{ type: "PropertyDetails", id }],
    }),

    getPropertyHistory: build.query<any[], number>({
      query: (id) => `properties/${id}/history`,
      providesTags: (result, error, id) => [{ type: "PropertyDetails", id }],
    }),

    // tanant related endpoint
    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      providesTags: (result) => {
        const tags: Array<{ type: "Tenants"; id: string | number }> = [];
        if (result?.id) {
          tags.push({ type: "Tenants", id: result.id });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    getCurrentResidences: build.query<CurrentResidence[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
      providesTags: (result) => {
        const tags: Array<{ type: "Properties"; id: string | number }> = [
          { type: "Properties", id: "LIST" }
        ];
        if (result && Array.isArray(result)) {
          result.forEach((property) => {
            if (property?.id) {
              tags.push({ type: "Properties", id: property.id });
            }
          });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to fetch current residences.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),
    updateTenantSettings: build.mutation <Tenant,{congnitoId:string} & Partial<Tenant>>({
      query: ({cognitoId, ...updatedTenant})=>({
        url: `/tenants/${cognitoId}`,
        method: "PUT",
        body: updatedTenant
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Tenants"; id: string | number }> = [];
        if (result?.id) {
          tags.push({ type: "Tenants", id: result.id });
        }
        return tags;
      }
    }),
    addFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Properties" | "Tenants"; id: string | number }> = [
          { type: "Properties", id: "LIST" }
        ];
        if (result?.id) {
          tags.push({ type: "Tenants", id: result.id });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!!",
          error: "Failed to add to favorites",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number} >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => {
        const tags: Array<{ type: "Properties" | "Tenants"; id: string | number }> = [
          { type: "Properties", id: "LIST" }
        ];
        if (result?.id) {
          tags.push({ type: "Tenants", id: result.id });
        }
        return tags;
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Removed from favorites!",
          error: "Failed to remove from favorites.",
        });
      },
    }),
    // lease related enpoints
    getLeases: build.query<Lease[], number>({
      query: () => "leases",
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to fetch leases.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to fetch property leases.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to fetch payment info.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }), //end of lease related endpoint
    // application related endpoints
    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append("userId", params.userId.toString());
        }
        if (params.userType) {
          queryParams.append("userType", params.userType);
        }

        return `applications?${queryParams.toString()}`;
      },
      providesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          error: "Failed to fetch applications.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    updateApplicationStatus: build.mutation<
      Application & { lease?: Lease },
      { id: number; status: string; leaseStartDate?: string }
    >({
      query: ({ id, status, leaseStartDate }) => ({
        url: `applications/${id}/status`,
        method: "PUT",
        body: { status, leaseStartDate },
      }),
      invalidatesTags: ["Applications", "Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
          success: "Application status updated successfully!",
          error: "Failed to update application settings.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({
        url: `applications`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
        await withToast(queryFulfilled, {
            success: "Application submitted successfully!",
            error: "Failed to submit application.",
        });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    checkExistingApplication: build.query<
      {
        hasExisting: boolean;
        application: Application | null;
        canApply: boolean;
        reason: string;
        restrictionType?: string;
        existingLease?: {
          propertyName: string;
          landlordName: string;
          startDate: string;
          endDate: string;
        };
      },
      { propertyId: number; tenantCognitoId: string }
    >({
      query: ({ propertyId, tenantCognitoId }) =>
        `applications/check/${propertyId}?tenantCognitoId=${tenantCognitoId}`,
      providesTags: ["Applications"],
    }),
    // Landlord profile (public)
    getLandlordProfile: build.query<any, string>({
      query: (id) => `view/profile/${id}`,
    }),

    // Safety Indicators
    getSafetyIndicator: build.query<any, number>({
      query: (locationId) => `safety/location/${locationId}`,
      providesTags: ["SafetyIndicators"],
    }),

    getAllSafetyIndicators: build.query<any[], void>({
      query: () => "safety",
      providesTags: ["SafetyIndicators"],
    }),

    updateSafetyIndicator: build.mutation<
      any,
      { locationId: number; level: "LOW" | "MEDIUM" | "HIGH"; reason?: string }
    >({
      query: ({ locationId, level, reason }) => ({
        url: `safety/location/${locationId}`,
        method: "PUT",
        body: { level, reason },
      }),
      invalidatesTags: ["SafetyIndicators"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Safety level updated successfully!",
            error: "Failed to update safety level.",
          });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    calculateSafetyIndicators: build.mutation<any, void>({
      query: () => ({
        url: "safety/calculate",
        method: "POST",
      }),
      invalidatesTags: ["SafetyIndicators"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Safety indicators calculated successfully!",
            error: "Failed to calculate safety indicators.",
          });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    // Safety Reviews
    createSafetyReview: build.mutation<
      any,
      {
        locationId: number;
        rating: number;
        comment?: string;
      }
    >({
      query: (body) => ({
        url: "safety-reviews",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SafetyIndicators"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Safety feedback submitted successfully!",
            error: "Failed to submit safety feedback.",
          });
        } catch {
          // prevent unhandled rejection (toast already shown)
        }
      },
    }),

    getTenantSafetyReviews: build.query<any[], void>({
      query: () => "safety-reviews/my-reviews",
      providesTags: ["SafetyIndicators"],
    }),

    getLocationSafetyReviews: build.query<
      { reviews: any[]; statistics: any },
      number
    >({
      query: (locationId) => `safety-reviews/location/${locationId}`,
      providesTags: ["SafetyIndicators"],
    }),

    // Tour endpoints
    scheduleTour: build.mutation<
      any,
      {
        applicationId: string;
        scheduledDate: string;
        landlordNotes?: string;
      }
    >({
      query: ({ applicationId, ...body }) => ({
        url: `tours/applications/${applicationId}/schedule`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Tour scheduled successfully!",
            error: "Failed to schedule tour.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getTourByApplication: build.query<any, string>({
      query: (applicationId) => `tours/applications/${applicationId}`,
      providesTags: ["Applications"],
    }),

    updateTour: build.mutation<
      any,
      {
        tourId: string;
        scheduledDate?: string;
        landlordNotes?: string;
        tenantNotes?: string;
        status?: string;
      }
    >({
      query: ({ tourId, ...body }) => ({
        url: `tours/${tourId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Tour updated successfully!",
            error: "Failed to update tour.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    completeTour: build.mutation<
      any,
      {
        tourId: string;
        feedbackRating?: number;
        landlordNotes?: string;
        tenantNotes?: string;
      }
    >({
      query: ({ tourId, ...body }) => ({
        url: `tours/${tourId}/complete`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Tour completed successfully!",
            error: "Failed to complete tour.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    cancelTour: build.mutation<
      any,
      {
        tourId: string;
        reason?: string;
      }
    >({
      query: ({ tourId, ...body }) => ({
        url: `tours/${tourId}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Tour cancelled successfully!",
            error: "Failed to cancel tour.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getLandlordTours: build.query<any[], { landlordCognitoId: string; status?: string }>({
      query: ({ landlordCognitoId, status }) => 
        `tours/landlord/${landlordCognitoId}${status ? `?status=${status}` : ''}`,
      providesTags: ["Applications"],
    }),

    getTenantTours: build.query<any[], { tenantCognitoId: string; status?: string }>({
      query: ({ tenantCognitoId, status }) => 
        `tours/tenant/${tenantCognitoId}${status ? `?status=${status}` : ''}`,
      providesTags: ["Applications"],
    }),

    // Lease termination endpoints
    createTerminationRequest: build.mutation<
      any,
      { leaseId: number; reason?: string }
    >({
      query: ({ leaseId, reason }) => ({
        url: `leases/${leaseId}/termination-request`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Termination request submitted successfully!",
            error: "Failed to submit termination request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getTenantTerminationRequests: build.query<any[], void>({
      query: () => "leases/termination-requests/tenant",
      providesTags: ["Leases"],
    }),

    getLandlordTerminationRequests: build.query<any[], void>({
      query: () => "leases/termination-requests/landlord",
      providesTags: ["Leases"],
    }),

    updateTerminationRequestStatus: build.mutation<
      any,
      { requestId: number; status: "APPROVED" | "DENIED"; landlordNotes?: string }
    >({
      query: ({ requestId, status, landlordNotes }) => ({
        url: `leases/termination-requests/${requestId}/status`,
        method: "PUT",
        body: { status, landlordNotes },
      }),
      invalidatesTags: ["Leases", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Termination request updated successfully!",
            error: "Failed to update termination request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // Verification endpoints
    getVerificationStatus: build.query<any, string>({
      query: (cognitoId) => `verification/status/${cognitoId}`,
      transformResponse: (response: { success: boolean; data: any }) => response.data,
      providesTags: (result, error, cognitoId) => [{ type: "Verification", id: cognitoId }],
    }),

    getTenantVerificationStatus: build.query<any, string>({
      query: (cognitoId) => `verification/status/${cognitoId}`,
      transformResponse: (response: { success: boolean; data: any }) => response.data,
      providesTags: (result, error, cognitoId) => [{ type: "Verification", id: cognitoId }],
    }),

    uploadVerificationDocuments: build.mutation<any, {
      cognitoId: string;
      formData: FormData;
      address?: string;
      latitude?: number;
      longitude?: number;
    }>({
      query: ({ cognitoId, formData, address, latitude, longitude }) => {
        // Add address and coordinates to formData if provided
        if (address) formData.append('address', address);
        if (latitude !== undefined) formData.append('latitude', latitude.toString());
        if (longitude !== undefined) formData.append('longitude', longitude.toString());
        
        return {
          url: `verification/upload/${cognitoId}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, error, { cognitoId }) => [{ type: "Verification", id: cognitoId }],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Documents and address uploaded successfully!",
            error: "Failed to upload documents.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // Withdraw a rejected tenant submission so they can resubmit
    withdrawVerification: build.mutation<any, { cognitoId: string }>({
      query: ({ cognitoId }) => ({
        url: `verification/withdraw/${cognitoId}`,
        method: "POST"
      }),
      invalidatesTags: (result, error, { cognitoId }) => [{ type: "Verification", id: cognitoId }],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Submission withdrawn. You may resubmit.",
            error: "Failed to withdraw submission."
          });
        } catch {}
      }
    }),

    previewVerificationDocuments: build.mutation<any, { formData: FormData }>({
      query: ({ formData }) => ({
        url: "verification/preview",
        method: "POST",
        body: formData,
      }),
    }),

    getPendingVerifications: build.query<{ landlords: any[]; tenants: any[] }, void>({
      query: () => "verification/admin/pending",
      transformResponse: (response: { success: boolean; data: { landlords: any[]; tenants: any[] } }) => response.data,
      providesTags: ["Verification"],
    }),

    approveVerification: build.mutation<any, { cognitoId: string; adminNotes?: string; userType: 'landlord' | 'tenant' }>({
      query: ({ cognitoId, adminNotes, userType }) => ({
        url: `verification/admin/approve/${cognitoId}`,
        method: "POST",
        body: { adminNotes, userType },
      }),
      invalidatesTags: ["Verification", "Tenants", "Landlords"], // Invalidate to refresh trust score
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Verification approved successfully! Trust score updated.",
            error: "Failed to approve verification.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    rejectVerification: build.mutation<any, { cognitoId: string; adminNotes: string; userType: 'landlord' | 'tenant' }>({
      query: ({ cognitoId, adminNotes, userType }) => ({
        url: `verification/admin/reject/${cognitoId}`,
        method: "POST",
        body: { adminNotes, userType },
      }),
      invalidatesTags: ["Verification"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Verification rejected successfully!",
            error: "Failed to reject verification.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    updateVerificationAddress: build.mutation<any, { 
      cognitoId: string; 
      address: string;
      latitude: number;
      longitude: number;
    }>({
      query: ({ cognitoId, address, latitude, longitude }) => ({
        url: `verification/address/${cognitoId}`,
        method: "PUT",
        body: { address, latitude, longitude },
      }),
      invalidatesTags: (result, error, { cognitoId }) => [{ type: "Verification", id: cognitoId }],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Address updated successfully!",
            error: "Failed to update address.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // User Management endpoints
    getAllUsers: build.query<any[], void>({
      query: () => "admins/users",
      transformResponse: (response: { success: boolean; data: any[] }) => response.data,
      providesTags: ["Users"],
    }),

    updateUser: build.mutation<any, { cognitoId: string; name: string; email: string; phoneNumber: string; userType: string; isActive: boolean; nidStatus?: string }>({
      query: ({ cognitoId, ...userData }) => ({
        url: `admins/users/${cognitoId}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: ["Users"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "User updated successfully!",
            error: "Failed to update user.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    deleteUser: build.mutation<any, string>({
      query: (cognitoId) => ({
        url: `admins/users/${cognitoId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "User deleted successfully!",
            error: "Failed to delete user.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // Community endpoints
    getCommunityPosts: build.query<any, { page?: number; limit?: number; type?: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.type && params.type !== 'all') queryParams.append("type", params.type);
        return `community/posts?${queryParams.toString()}`;
      },
      providesTags: (result) => {
        const tags: Array<{ type: "Posts"; id: string | number }> = [
          { type: "Posts", id: "LIST" }
        ];
        if (result?.data?.posts && Array.isArray(result.data.posts)) {
          result.data.posts.forEach((post: any) => {
            if (post?.id) {
              tags.push({ type: "Posts", id: post.id });
            }
          });
        }
        return tags;
      },
    }),

    createCommunityPost: build.mutation<any, { content: string; type?: string; availableSeats?: number }>({
      query: (body) => ({
        url: "community/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Posts", id: "LIST" }, "Tenants"], // Invalidate Tenants to refresh trust score
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Post created successfully! Trust score updated.",
            error: "Failed to create post.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getCommunityPost: build.query<any, string>({
      query: (id) => `community/posts/${id}`,
      providesTags: (result, error, id) => [{ type: "Posts", id }],
    }),

    createComment: build.mutation<any, { postId: string; content: string }>({
      query: (body) => ({
        url: "community/comments",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Posts", id: postId },
        { type: "Comments", id: "LIST" }
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Comment added successfully!",
            error: "Failed to add comment.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getPostComments: build.query<any[], string>({
      query: (postId) => `community/posts/${postId}/comments`,
      providesTags: (result, error, postId) => [
        { type: "Comments", id: "LIST" },
        { type: "Posts", id: postId }
      ],
    }),

    // Roommate endpoints
    getRoommateMatches: build.query<any[], void>({
      query: () => "roommates/matches",
      providesTags: ["RoommateMatches"],
    }),

    getRoommateRequests: build.query<any[], void>({
      query: () => "roommates/requests",
      providesTags: ["RoommateRequests"],
    }),

    sendConnectionRequest: build.mutation<any, { receiverId: string }>({
      query: (body) => ({
        url: "roommates/connection",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoommateRequests", "RoommateMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Connection request sent!",
            error: "Failed to send connection request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    respondToConnectionRequest: build.mutation<any, { requestId: string; response: "accepted" | "declined" }>({
      query: ({ requestId, response }) => ({
        url: `roommates/connection/${requestId}`,
        method: "PUT",
        body: { response },
      }),
      invalidatesTags: ["RoommateRequests", "Leases", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Request updated successfully!",
            error: "Failed to update request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getRoommatePreference: build.query<any, void>({
      query: () => "roommates/preference",
      providesTags: ["RoommatePreference"],
    }),

    updateRoommatePreference: build.mutation<any, any>({
      query: (body) => ({
        url: "roommates/preference",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoommatePreference", "RoommateMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Preferences updated successfully!",
            error: "Failed to update preferences.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // Connection endpoints (for Book Seat feature)
    sendBookingRequest: build.mutation<any, { receiverCognitoId: string }>({
      query: (body) => ({
        url: "connections/send",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RoommateRequests", "RoommateMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Booking request sent successfully!",
            error: "Failed to send booking request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    acceptBookingRequest: build.mutation<any, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `connections/${connectionId}/accept`,
        method: "PUT",
      }),
      invalidatesTags: ["RoommateRequests"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Booking request accepted!",
            error: "Failed to accept booking request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    rejectBookingRequest: build.mutation<any, { connectionId: string }>({
      query: ({ connectionId }) => ({
        url: `connections/${connectionId}/reject`,
        method: "PUT",
      }),
      invalidatesTags: ["RoommateRequests"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Booking request rejected",
            error: "Failed to reject booking request.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    getConnectionStatus: build.query<any, string>({
      query: (targetCognitoId) => `connections/status/${targetCognitoId}`,
      providesTags: ["RoommateRequests"],
    }),

    getMyConnections: build.query<any[], void>({
      query: () => "connections/my-connections",
      providesTags: ["RoommateRequests"],
    }),

    // Remove roommate from lease
    removeRoommate: build.mutation<any, { roommateCognitoId: string }>({
      query: ({ roommateCognitoId }) => ({
        url: `roommates/roommate/${roommateCognitoId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tenants", "Leases", "RoommateRequests", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Roommate removed successfully!",
            error: "Failed to remove roommate.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),

    // Rating endpoints
    rateUser: build.mutation<any, { targetUserId: string; rating: number; comment?: string }>({
      query: (body) => ({
        url: "ratings/rate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users", "RoommateMatches"],
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await withToast(queryFulfilled, {
            success: "Rating submitted successfully!",
            error: "Failed to submit rating.",
          });
        } catch {
          // prevent unhandled rejection
        }
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery, useUpdateTenantSettingsMutation
, useUpdateLandlordSettingsMutation, useUpdateAdminSettingsMutation,
 useGetPropertiesQuery,useGetPropertyQuery, useGetPropertyHistoryQuery, useAddFavoritePropertyMutation,
 useRemoveFavoritePropertyMutation,
 useGetTenantQuery,
 useGetLandlordQuery,
 useGetCurrentResidencesQuery,
 useGetLeasesQuery, useGetPropertyLeasesQuery, useGetPaymentsQuery,
  useGetLandlordPropertiesQuery,
  useCreatePropertyMutation,
  useDeletePropertyMutation,
  useGetApplicationsQuery, useUpdateApplicationStatusMutation, useCreateApplicationMutation, useCheckExistingApplicationQuery,
  useCreateReviewMutation, useGetReviewsQuery,
  useGetLandlordProfileQuery,
  useGetSafetyIndicatorQuery, useGetAllSafetyIndicatorsQuery, useUpdateSafetyIndicatorMutation, useCalculateSafetyIndicatorsMutation,
  useCreateSafetyReviewMutation, useGetTenantSafetyReviewsQuery, useGetLocationSafetyReviewsQuery,
  useScheduleTourMutation, useGetTourByApplicationQuery, useUpdateTourMutation, useCompleteTourMutation, useCancelTourMutation,
  useGetLandlordToursQuery, useGetTenantToursQuery,
  useCreateTerminationRequestMutation, useGetTenantTerminationRequestsQuery, useGetLandlordTerminationRequestsQuery, useUpdateTerminationRequestStatusMutation,
  // Verification hooks
  useGetVerificationStatusQuery,
  useGetTenantVerificationStatusQuery,
  useUploadVerificationDocumentsMutation,
  useWithdrawVerificationMutation,
  usePreviewVerificationDocumentsMutation,
  useGetPendingVerificationsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useUpdateVerificationAddressMutation,
  // User Management hooks
  useGetAllUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  // Community hooks
  useGetCommunityPostsQuery,
  useCreateCommunityPostMutation,
  useGetCommunityPostQuery,
  useCreateCommentMutation,
  useGetPostCommentsQuery,
  // Roommate hooks
  useGetRoommateMatchesQuery,
  useGetRoommateRequestsQuery,
  useSendConnectionRequestMutation,
  useRespondToConnectionRequestMutation,
  useGetRoommatePreferenceQuery,
  useUpdateRoommatePreferenceMutation,
  // Connection hooks (Book Seat feature)
  useSendBookingRequestMutation,
  useAcceptBookingRequestMutation,
  useRejectBookingRequestMutation,
  useGetConnectionStatusQuery,
  useGetMyConnectionsQuery,
  useRemoveRoommateMutation,
  // Rating hooks
  useRateUserMutation,
 } = api;
