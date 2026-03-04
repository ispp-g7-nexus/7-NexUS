import { useState } from "react";
import { AdminSpaces } from "../pages/Reservations/AdminSpaces";
import { AdminObjects } from "../pages/Objects/AdminObjects";

export function AdminReservations() {
  const [activeTab, setActiveTab] = useState("espacios");
  
  const tabs = [
    { id: "espacios", label: "Espacios" },
    { id: "objetos", label: "Objetos" },
  ];
  
  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? "text-[#4A7C59] border-[#4A7C59]" 
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === "espacios" && <AdminSpaces />}
        {activeTab === "objetos" && <AdminObjects />}
      </div>
    </div>
  );
}
