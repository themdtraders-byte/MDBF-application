"use client";

import { useState, useEffect } from 'react';

export const useAccessControl = () => {
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accountInfo = localStorage.getItem('dukaanxp-active-account');
      if (accountInfo) {
        try {
          const parsedInfo = JSON.parse(accountInfo);
          // If accessLevel is 'view', it's read-only.
          // If accessLevel is missing (for older setups), default to NOT read-only for safety.
          setIsReadOnly(parsedInfo.accessLevel === 'view');
        } catch (e) {
          console.error("Failed to parse active account info:", e);
          setIsReadOnly(false);
        }
      } else {
        setIsReadOnly(false);
      }
    }
  }, []);

  return { isReadOnly };
};
