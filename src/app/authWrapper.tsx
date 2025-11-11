"use client";

import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();

  // console.log("Auth User:", authUser);
  const router = useRouter();
      const pathname = usePathname();
      const [isLoading, setIsLoading]= useState(true);
      useEffect(()=>{
        if(authUser){
          const userRole = authUser.userRole?.toLowerCase();
          // Admins -> admin dashboard
          if (userRole === "admin") {
            if (!pathname.startsWith('/admins')) {
              router.push('/admins/dashboard', { scroll: false });
              return;
            }
          }

          // Landlords visiting search or root should be redirected to their dashboard
          if (
            userRole === "landlord" && (pathname.startsWith("/search") || pathname === "/")
          ) {
            router.push("/landlords/dashboard", { scroll: false });
            return;
          }

          // For other cases, stop loading and allow rendering
          setIsLoading(false);
        }
      },[authUser, pathname, router]);
      if (authLoading) return <>Loading...</>; 

  // List of public routes that don't require auth
  const publicRoutes = ["/landlords/profile/", "/reviews"];

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return <>{children}</>; // Allow access without auth
  }

  return <>{children}</>;
}
