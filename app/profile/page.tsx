"use client";

import { FormEvent, useEffect, useState } from "react";
import CompanyHeader from "@/app/components/CompanyHeader";

type Profile = {
  shopName: string;
  gstin: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<Profile>({
      shopName: "",
      gstin: "",
      pan: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response =
          await fetch(
            "/api/business-profile",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load profile."
          );
        }

        if (data.profile) {
          setProfile({
            shopName:
              data.profile.shopName || "",

            gstin:
              data.profile.gstin || "",

            pan:
              data.profile.pan || "",

            phone:
              data.profile.phone || "",

            email:
              data.profile.email || "",

            address:
              data.profile.address || "",

            city:
              data.profile.city || "",

            state:
              data.profile.state || "",

            pincode:
              data.profile.pincode || "",
          });
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/business-profile",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              profile
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save profile."
        );
      }

      setProfile({
        ...profile,
        ...data.profile,
      });

      setMessage(
        "Business profile updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(
    field: keyof Profile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100">
        <CompanyHeader pageTitle="Profile" />

        <div className="flex justify-center py-20">
          <div className="text-gray-500">
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">

      <CompanyHeader pageTitle="Profile" />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Business Profile
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage the company information used
            throughout Stock Sence and on invoices.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white shadow-sm"
        >

          {/* BUSINESS INFORMATION */}

          <div className="border-b px-6 py-5">

            <h3 className="text-lg font-semibold text-gray-900">
              Business Information
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              This information will appear on your bills.
            </p>

          </div>

          <div className="space-y-5 p-6">

            {/* SHOP NAME */}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Shop / Company Name *
              </label>

              <input
                type="text"
                value={profile.shopName}
                onChange={(e) =>
                  updateField(
                    "shopName",
                    e.target.value
                  )
                }
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="S. V. Enterprises"
              />
            </div>

            {/* GST + PAN */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  GSTIN
                </label>

                <input
                  type="text"
                  value={profile.gstin || ""}
                  onChange={(e) =>
                    updateField(
                      "gstin",
                      e.target.value.toUpperCase()
                    )
                  }
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="GSTIN"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  PAN
                </label>

                <input
                  type="text"
                  value={profile.pan || ""}
                  onChange={(e) =>
                    updateField(
                      "pan",
                      e.target.value.toUpperCase()
                    )
                  }
                  maxLength={10}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="PAN"
                />
              </div>

            </div>

            {/* PHONE + EMAIL */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) =>
                    updateField(
                      "phone",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) =>
                    updateField(
                      "email",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Email address"
                />
              </div>

            </div>

            {/* ADDRESS */}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address
              </label>

              <textarea
                value={profile.address || ""}
                onChange={(e) =>
                  updateField(
                    "address",
                    e.target.value
                  )
                }
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Shop / company address"
              />
            </div>

            {/* CITY STATE PINCODE */}

            <div className="grid gap-5 md:grid-cols-3">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  City
                </label>

                <input
                  type="text"
                  value={profile.city || ""}
                  onChange={(e) =>
                    updateField(
                      "city",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  State
                </label>

                <input
                  type="text"
                  value={profile.state || ""}
                  onChange={(e) =>
                    updateField(
                      "state",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pincode
                </label>

                <input
                  type="text"
                  value={profile.pincode || ""}
                  onChange={(e) =>
                    updateField(
                      "pincode",
                      e.target.value
                    )
                  }
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Pincode"
                />
              </div>

            </div>

            {/* MESSAGE */}

            {message && (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                ✓ {message}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

          </div>

          {/* SAVE */}

          <div className="flex justify-end border-t bg-gray-50 px-6 py-4">

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}