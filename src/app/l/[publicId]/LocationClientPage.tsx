"use client";

import AppInfoButton from "@/components/shared/AppInfoButton";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useState } from "react";
import PinGate from "@/components/location/PinGate";
import OrderMvp from "@/components/location/OrderMvp";
import LocationOrders from "@/components/location/LocationOrders";

export default function LocationClientPage({ publicId }: { publicId: string }) {
  const [unlocked, setUnlocked] = useState(false);
  const [locationName, setLocationName] = useState("");

  async function logout() {
    await fetch("/api/location/logout", { method: "POST" });
    setUnlocked(false);
    setLocationName("");
  }

  if (!unlocked) {
    return (
      <PinGate
        publicId={publicId}
        onUnlocked={(name) => {
          setLocationName(name);
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">{locationName}</h1>
          <p className="p-muted m0">Location ist freigeschaltet.</p>
        </div>
        <div className="row row-end row-wrap gap-10">
          <AppInfoButton />
          <ThemeToggle />
          <button type="button" className="btn-pill" onClick={logout}>
            Abmelden <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </div>

      <div className="mt-14">
        <OrderMvp />
        <LocationOrders />
      </div>
    </div>
  );
}