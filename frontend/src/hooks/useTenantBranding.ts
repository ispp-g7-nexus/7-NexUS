import { useEffect } from "react";
import { brandingService, type ResidenceBranding } from "../services/branding";

const normalizeHexColor = (input: string, fallback: string): string => {
    const value = (input || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
    return fallback;
};

const hexToHslArray = (hex: string): [number, number, number] => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hexToHslString = (hex: string): string => {
    const [h, s, l] = hexToHslArray(hex);
    return `${h} ${s}% ${l}%`;
};

const getContrastForegroundColor = (hex: string): string => {
    const cleanHex = hex.replace(/^#/, '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "222.2 84% 4.9%" : "210 40% 98%"; // Dark text if light bgColor, else White text
};

const generateTailwindPalette = (hex: string, prefix: string) => {
    const [h, s, l] = hexToHslArray(hex);
    
    const baseL = l; 
    
    // Scale up from baseL to 98% (lightest)
    const upScale = (step: number, maxSteps: number) => {
        const diff = 98 - baseL;
        return baseL + (diff * (step / maxSteps));
    }
    
    // Scale down from baseL to 10% (darkest)
    const downScale = (step: number, maxSteps: number) => {
        const diff = baseL - 10;
        return baseL - (diff * (step / maxSteps));
    }

    const lightnessMap: Record<number, number> = {
        50: upScale(5, 5),   
        100: upScale(4, 5),
        200: upScale(3, 5),
        300: upScale(2, 5),
        400: upScale(1, 5),
        500: (upScale(1, 5) + baseL) / 2, 
        600: baseL,          
        700: downScale(1, 4),
        800: downScale(2, 4),
        900: downScale(3, 4),
        950: downScale(4, 4), 
    };

    const root = document.documentElement;
    for (const [shade, lightness] of Object.entries(lightnessMap)) {
        root.style.setProperty(`--${prefix}-${shade}`, `${h} ${s}% ${Math.round(lightness)}%`);
    }
};

export const applyGlobalBranding = (branding: ResidenceBranding) => {
    const primary = normalizeHexColor(branding.primary_color, "#4A8F5D");
    const secondary = normalizeHexColor(branding.secondary_color, "#0F4C81");
    const accent = normalizeHexColor(branding.accent_color, "#2E7D32");

    const root = document.documentElement;

    // Set standard Tailwind variables using HSL
    root.style.setProperty("--primary", hexToHslString(primary));
    root.style.setProperty("--primary-foreground", getContrastForegroundColor(primary));
    root.style.setProperty("--primary-brand", hexToHslString(primary));
    root.style.setProperty("--secondary", hexToHslString(secondary));
    root.style.setProperty("--accent", hexToHslString(accent));
    
    // Generate full dynamic Tailwind palette (e.g. green-50 to green-950)
    generateTailwindPalette(primary, "tenant-primary");

    // Custom CSS
    const customCssId = "tenant-custom-css";
    let customStyle = document.getElementById(customCssId);
    if (!customStyle) {
        customStyle = document.createElement("style");
        customStyle.id = customCssId;
        document.head.appendChild(customStyle);
    }
    customStyle.textContent = branding.custom_css || "";

    // Favicon update
    if (branding.favicon_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = branding.favicon_url;
    }
};

export const DEFAULT_BRANDING: ResidenceBranding = {
    primary_color: "#4A8F5D",
    secondary_color: "#0F4C81",
    accent_color: "#2E7D32",
    logo_url: "",
    favicon_url: "/favicon.ico",
    custom_css: "",
    updated_at: new Date().toISOString()
};

export function useTenantBranding() {
    useEffect(() => {
        let mounted = true;

        // Apply defaults immediately to prevent white-out
        applyGlobalBranding(DEFAULT_BRANDING);

        const isPublicRoute = 
            globalThis.location.pathname === "/" || 
            globalThis.location.pathname.includes("login") || 
            globalThis.location.pathname === "/forgot-password" || 
            globalThis.location.pathname === "/reset-password";

        if (isPublicRoute) {
            applyGlobalBranding(DEFAULT_BRANDING);
            return;
        }

        const loadBranding = async () => {
            try {
                const branding = await brandingService.get();
                if (!mounted) return;
                applyGlobalBranding(branding);
            } catch (error) {
                if (mounted) {
                    applyGlobalBranding(DEFAULT_BRANDING);
                }
            }
        };

        loadBranding();

        const handleBrandingUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<ResidenceBranding>;
            if (customEvent.detail) {
                applyGlobalBranding(customEvent.detail);
            }
        };

        globalThis.addEventListener("tenant-branding-updated", handleBrandingUpdate as EventListener);

        return () => {
            mounted = false;
            globalThis.removeEventListener("tenant-branding-updated", handleBrandingUpdate as EventListener);
        };
    }, [globalThis.location.pathname]);
}
