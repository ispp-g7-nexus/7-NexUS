import { useState } from "react";
import { Objects } from "../pages/Objects/Objects";
import { Reservations } from "../pages/Reservations/Reservations";

export function StudentReservations() {
  const [activeTab, setActiveTab] = useState("objetos");

  const tabs = [
    { id: "espacios", label: "Espacios" },
    { id: "objetos", label: "Objetos" },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F6F7F9] relative">
      {/* Header */}
      <header className="bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg">
        <h1 className="text-white text-2xl font-bold">Reservas</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        <div className="bg-card rounded-xl shadow-sm border border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
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
          <div className="min-h-[500px]">
            {activeTab === "espacios" && (
              <div className="h-full">
                <Reservations />
              </div>
            )}

            {activeTab === "objetos" && (
              <div className="h-full">
                <Objects />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}