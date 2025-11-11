"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import TenantVerificationForm from "@/components/TenantVerificationForm";

const VerifyTenantPage = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Identity Verification</h1>
          <p className="text-gray-600">
            Verify your identity by uploading NID front & back and a recent photograph to access community features.
          </p>
        </div>

        <TenantVerificationForm />
      </div>
    </div>
  );
};

export default VerifyTenantPage;