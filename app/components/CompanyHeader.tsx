"use client";

import { useEffect, useState } from "react";
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
  const [shopName, setShopName] =
    useState("Your Shop");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadCompany() {
      try {
        const response = await fetch(
          "/api/business-profile",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const profile =
          data.profile as
            | BusinessProfile
            | null
            | undefined;

        if (profile?.shopName) {
          setShopName(
            profile.shopName
          );
        }
      } catch (error) {
        console.error(
          "Failed to load company name:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

        {/* COMPANY */}

        <div className="min-w-0">

          <h1 className="truncate text-xl font-bold text-gray-900">
            {loading
              ? "Loading..."
              : shopName}
          </h1>

          <div className="flex items-center gap-2">

            <p className="text-sm text-gray-500">
              Stock Sence
            </p>

            {pageTitle && (
              <>
                <span className="text-gray-300">
                  /
                </span>

                <p className="text-sm text-gray-500">
                  {pageTitle}
                </p>
              </>
            )}

          </div>

        </div>

        {/* NAVIGATION */}

        <div className="flex items-center gap-2">

          <Link
            href="/"
            className="hidden rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:block"
          >
            Dashboard
          </Link>
          <a
  href="/profile"
  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  👤 Profile
</a>

          <LogoutButton />

        </div>

      </div>
    </header>
  );
}