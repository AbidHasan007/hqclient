import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEnumString(str: string) {
  return str.replace(/([A-Z])/g, " $1").trim();
}

export function formatPriceValue(value: number | null, isMin: boolean) {
  if (value === null || value === 0)
    return isMin ? "Any Min Price" : "Any Max Price";
  if (value >= 1000) {
    const kValue = value / 1000;
    return isMin ? `৳${kValue}k+` : `<৳${kValue}k`;
  }
  return isMin ? `৳${value}+` : `<৳${value}`;
}

export function cleanParams(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) => {
        // Special handling for availableFrom dates
        if (key === 'availableFrom' && value) {
          try {
            // Handle different date formats
            if (typeof value === 'string' && value !== "any" && value !== "") {
              const date = new Date(value);
              const isValidDate = !isNaN(date.getTime()) && date > new Date('1900-01-01');
              console.log(`Date validation for ${value}: ${isValidDate}`);
              return isValidDate;
            }
            return false;
          } catch (error) {
            console.error(`Error validating date ${value}:`, error);
            return false;
          }
        }
        
        return (
          value !== undefined &&
          value !== "any" &&
          value !== "" &&
          (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
        );
      }
    )
  );
}

type MutationMessages = {
  success?: string;
  error: string;
};

export const withToast = async <T>(
  mutationFn: Promise<T>,
  messages: Partial<MutationMessages>
) => {
  const { success, error } = messages;

  try {
    const result = await mutationFn;
    if (success) toast.success(success);
    return result;
  } catch (err) {
    if (error) toast.error(error);
    throw err;
  }
};

export const formatDateForAPI = (dateStr: string): string | null => {
  if (!dateStr || dateStr === "any" || dateStr === "") return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    // Return in ISO format for consistent server processing
    return date.toISOString();
  } catch {
    return null;
  }
};

export const createNewUserInDatabase = async (
  user: any,
  idToken: any,
  userRole: string,
  fetchWithBQ: any
) => {
  const createEndpoint =
  userRole?.toLowerCase() === "admin"
    ? "/admins"
    : userRole?.toLowerCase() === "landlord"
    ? "/landlords"
    : "/tenants";

  // Extract user data from the token and user attributes
  const userData: any = {
    cognitoId: user.userId,
    name: idToken?.payload?.name || user.attributes?.name || idToken?.payload?.given_name || user.attributes?.given_name || user.username || "",
    email: idToken?.payload?.email || user.attributes?.email || "",
    phoneNumber: idToken?.payload?.phone_number || user.attributes?.phone_number || "",
  };

  // Add gender for tenants and landlords if available
  if (userRole?.toLowerCase() === "tenant" || userRole?.toLowerCase() === "landlord") {
    userData.gender = idToken?.payload?.["custom:gender"] || user.attributes?.["custom:gender"] || null;
  }

  console.log("Creating user with data:", userData);

  const createUserResponse = await fetchWithBQ({
    url: createEndpoint,
    method: "POST",
    body: userData,
  });

  if (createUserResponse.error) {
    // Handle specific error messages from the server
    const errorMessage = createUserResponse.error?.data?.message || 
                        createUserResponse.error?.message || 
                        "Failed to create user record";
    throw new Error(errorMessage);
  }

  return createUserResponse;
};
