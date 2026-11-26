"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!shopName.trim()) {
      setError(
        "Shop / Company name is required."
      );
      return;
    }

    if (!username.trim()) {
      setError(
        "Username is required."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/auth/signup",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            shopName: shopName.trim(),
            gstin: gstin.trim(),
            pan: pan.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),

            name: name.trim(),
            username: username.trim(),
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create account."
        );
      }

      setSuccess(
        "Account created successfully. Redirecting to login..."
      );

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">

      <div className="mx-auto w-full max-w-3xl">

        {/* BRAND */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="StockSense"
            width={220}
            height={72}
            priority
            className="mb-3 h-auto w-40 object-contain sm:w-48"
          />

          <p className="text-sm text-gray-500">
            Distribution Management System
          </p>
        </div>

        {/* CARD */}

        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">

          <div className="mb-8">

            <h2 className="text-2xl font-bold text-gray-900">
              Create Your Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter your business information.
              These details can be used on your
              invoices and bills.
            </p>

          </div>

          <form
            onSubmit={handleSignup}
            className="space-y-8"
          >

            {/* ==================================================
                BUSINESS INFORMATION
                ================================================== */}

            <section>

              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Business Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* SHOP NAME */}

                <div className="sm:col-span-2">

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Shop / Company Name *
                  </label>

                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) =>
                      setShopName(
                        e.target.value
                      )
                    }
                    placeholder="S. V. Enterprises"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                {/* GSTIN */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    GSTIN
                  </label>

                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) =>
                      setGstin(
                        e.target.value.toUpperCase()
                      )
                    }
                    maxLength={15}
                    placeholder="15-character GSTIN"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                {/* PAN */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    PAN
                  </label>

                  <input
                    type="text"
                    value={pan}
                    onChange={(e) =>
                      setPan(
                        e.target.value.toUpperCase()
                      )
                    }
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

              </div>

            </section>

            {/* ==================================================
                CONTACT
                ================================================== */}

            <section>

              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Contact Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="9876543210"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    placeholder="business@example.com"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

              </div>

            </section>

            {/* ==================================================
                ADDRESS
                ================================================== */}

            <section>

              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Business Address
              </h3>

              <div className="space-y-4">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) =>
                      setAddress(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Shop / office address"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                <div className="grid gap-4 sm:grid-cols-3">

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      City
                    </label>

                    <input
                      type="text"
                      value={city}
                      onChange={(e) =>
                        setCity(
                          e.target.value
                        )
                      }
                      placeholder="City"
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      State
                    </label>

                    <input
                      type="text"
                      value={state}
                      onChange={(e) =>
                        setState(
                          e.target.value
                        )
                      }
                      placeholder="State"
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      PIN Code
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={pincode}
                      onChange={(e) =>
                        setPincode(
                          e.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(0, 6)
                        )
                      }
                      maxLength={6}
                      placeholder="560001"
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                  </div>

                </div>

              </div>

            </section>

            {/* ==================================================
                LOGIN INFORMATION
                ================================================== */}

            <section>

              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Login Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">

                {/* NAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Your Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    placeholder="Your name"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                {/* USERNAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Username *
                  </label>

                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                      )
                    }
                    placeholder="Choose username"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                {/* PASSWORD */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Password *
                  </label>

                  <div className="relative">

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder="Minimum 8 characters"
                      disabled={loading}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </div>

                {/* CONFIRM */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Confirm Password *
                  </label>

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter password again"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

              </div>

            </section>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
              >
                {success}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-3.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating Account..."
                : "Create StockSense Account"}
            </button>

          </form>

          {/* LOGIN LINK */}

          <div className="mt-6 border-t pt-5 text-center">

            <p className="text-sm text-gray-500">
              Already have an account?
            </p>

            <a
              href="/login"
              className="mt-1 inline-block font-semibold text-green-600 hover:text-green-700"
            >
              Sign In
            </a>

          </div>

        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
            StockSense © 2026. All rights reserved.
            </p>

      </div>

    </main>
  );
}