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
    <div className="w-full bg-background">
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Reservas</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 m-1 rounded-lg text-sm transition-all ${
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground font-bold shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
    </div>
  );
}