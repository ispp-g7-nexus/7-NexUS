import React from "react";
import { Sparkles, Heart } from "lucide-react";
import type { MatchItem } from "../../../services/matching";
import { getInitials, getTags } from "../utils";

interface MatchCardProps {
    match: MatchItem;
    index: number;
    isSaved: boolean;
    onToggleSave: (membershipId: number, e?: React.MouseEvent) => void;
    onClick: () => void;
}

export function MatchCard({
    match,
    index,
    isSaved,
    onToggleSave,
    onClick,
}: Readonly<MatchCardProps>) {
    const scorePercent = Math.round(match.score * 100);
    const isTop3 = index < 3;
    const tags = getTags(match);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            className="relative bg-white border border-gray-200 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row gap-4 hover:-translate-y-0.5 cursor-pointer"
        >
            {isTop3 && (
                <div className="absolute -top-3 -right-3">
                    <div
                        className={`
                            flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md
                            ${index === 0 ? "bg-gradient-to-r from-yellow-400 to-amber-500" : ""}
                            ${index === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400" : ""}
                            ${index === 2 ? "bg-gradient-to-r from-orange-400 to-amber-600" : ""}
                        `}
                    >
                        <Sparkles className="w-3 h-3" />
                        TOP {index + 1}
                    </div>
                </div>
            )}

            <div className="flex items-center sm:items-start flex-1 gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-sm">
                    {getInitials(match.display_name)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                            {match.display_name}
                        </h3>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                                <Sparkles className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold">{scorePercent}% Match</span>
                            </div>
                            <button
                                onClick={(e) => onToggleSave(match.membership_id, e)}
                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                    isSaved
                                        ? "bg-pink-50 text-pink-500"
                                        : "bg-gray-50 text-slate-400 hover:bg-gray-50 hover:text-pink-400"
                                }`}
                                aria-label="Guardar Match"
                            >
                                <Heart
                                    className="w-5 h-5 pointer-events-none"
                                    fill={isSaved ? "currentColor" : "none"}
                                    strokeWidth={2.5}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {tags.map((tag, i) => (
                            <span
                                key={i}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium ${tag.color}`}
                            >
                                {tag.label}
                            </span>
                        ))}
                        {tags.length === 0 && (
                            <span className="text-xs text-slate-400 italic py-1">
                                Sin preferencias destacadas
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
