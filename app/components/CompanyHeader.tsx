"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

type BusinessProfile = {
  shopName: string;
};

type Props = {
  pageTitle?: string;
};

export default function CompanyHeader({
  pageTitle,
}: Props) {
  const [shopName, setShopName] = useState("Your Shop");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompany() {
      try {
        const response = await fetch("/api/business-profile", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        const profile = data.profile as
          | BusinessProfile
          | null
          | undefined;

        if (profile?.shopName) {
          setShopName(profile.shopName);
        }
      } catch (error) {
        console.error("Failed to load company name:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* STOCKSENSE BRAND + COMPANY */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            aria-label="StockSense dashboard"
            className="shrink-0"
          >
            <Image
              src="/logo.png"
              alt="StockSense"
              width={220}
              height={72}
              priority
              className="h-auto w-32 object-contain sm:w-40"
            />
          </Link>

          <div className="hidden h-10 border-l border-gray-200 sm:block" />

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-gray-900 sm:text-base">
              {loading ? "Loading..." : shopName}
            </h1>

            {pageTitle && (
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                {pageTitle}
              </p>
            )}
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="hidden rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:block"
          >
            Dashboard
          </Link>

          <Link
            href="/profile"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="hidden sm:inline">Profile</span>
            <span className="sm:hidden" aria-label="Profile">👤</span>
          </Link>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
