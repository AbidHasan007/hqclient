"use client";

import React from 'react';
import Auth from '../(auth)/authProvider';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(14,165,233,0.1)_1px,_transparent_0)] [background-size:20px_20px]"></div>
      <div className="relative">
        <Auth>
          <div className="hidden">
            {/* This page is handled by the Auth component */}
          </div>
        </Auth>
      </div>
    </div>
  );
}