"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface KBSuggestion {
  title: string;
  url: string;
  sourceId: string;
}

const staticKBArticles: KBSuggestion[] = [
  {
    title: "How to Reset Your Password",
    url: "https://help.example.com/articles/password-reset",
    sourceId: "kb-001",
  },
  {
    title: "Troubleshooting Login Issues",
    url: "https://help.example.com/articles/login-troubleshooting",
    sourceId: "kb-002",
  },
  {
    title: "Billing FAQ and Payment Methods",
    url: "https://help.example.com/articles/billing-faq",
    sourceId: "kb-003",
  },
  {
    title: "Account Security Best Practices",
    url: "https://help.example.com/articles/account-security",
    sourceId: "kb-004",
  },
  {
    title: "Getting Started with API Integration",
    url: "https://help.example.com/articles/api-getting-started",
    sourceId: "kb-005",
  },
  {
    title: "Two-Factor Authentication Setup Guide",
    url: "https://help.example.com/articles/2fa-setup",
    sourceId: "kb-006",
  },
  {
    title: "How to Cancel or Downgrade Your Subscription",
    url: "https://help.example.com/articles/cancel-subscription",
    sourceId: "kb-007",
  },
  {
    title: "Common Error Codes and Solutions",
    url: "https://help.example.com/articles/error-codes",
    sourceId: "kb-008",
  },
  {
    title: "Data Export and Backup Options",
    url: "https://help.example.com/articles/data-export",
    sourceId: "kb-009",
  },
  {
    title: "SSO Configuration for Enterprise",
    url: "https://help.example.com/articles/sso-enterprise",
    sourceId: "kb-010",
  },
];

function filterArticles(query: string): KBSuggestion[] {
  if (!query || query.trim().length < 2) return [];

  const lower = query.toLowerCase();

  return staticKBArticles.filter((article) =>
    article.title.toLowerCase().includes(lower),
  );
}

export function useProactiveSearch(query: string) {
  const [suggestions, setSuggestions] = useState<KBSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    timerRef.current = setTimeout(() => {
      const results = filterArticles(query);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query]);

  const limitedSuggestions = useMemo(
    () => suggestions.slice(0, 3),
    [suggestions],
  );

  return { suggestions: limitedSuggestions, isSearching };
}
