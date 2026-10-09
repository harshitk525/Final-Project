"use client";

import * as React from "react";
import dynamic from "@/lib/dynamic";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import { Check, Copy, Search, Navigation2, ExternalLink, Sparkles, LocateFixed, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reverseGeocode } from "@/services/geocodingService";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-sky-500/50" />
      </div>
      <span className="text-xs font-semibold tracking-wider text-sky-300/80 uppercase">
        Initializing 3D Engine...
      </span>
    </div>
  ),
}) as React.ComponentType<
  GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }
>;

export type GlobeLocation = {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lng: number;
  address: string;
  email: string;
  isUserLocation?: boolean;
};

const DEFAULT_LOCATIONS: GlobeLocation[] = [
  { id: "11", name: "India", country: "IN", lat: 19.076, lng: 72.8777, address: "Central Terminal & Transit Hub, India", email: "india@vektor-mobility.com" },
  { id: "1", name: "Milan", country: "IT", lat: 45.4642, lng: 9.19, address: "123 Via Milano, Milan 20121, IT", email: "milan@vektor-mobility.com" },
  { id: "2", name: "Cape Town", country: "ZA", lat: -33.9249, lng: 18.4241, address: "456 Table Mountain Rd, Cape Town 8001, ZA", email: "capetown@vektor-mobility.com" },
  { id: "3", name: "New York", country: "US", lat: 40.7128, lng: -74.006, address: "789 Broadway, New York NY 10003, US", email: "ny@vektor-mobility.com" },
  { id: "4", name: "London", country: "GB", lat: 51.5074, lng: -0.1278, address: "2 Bedford Gardens, London W8 7EH, UK", email: "london@vektor-mobility.com" },
  { id: "5", name: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473, address: "321 Nelson Mandela Square, Johannesburg 2196, ZA", email: "joburg@vektor-mobility.com" },
  { id: "6", name: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503, address: "1-1-1 Shibuya, Tokyo 150-0002, JP", email: "tokyo@vektor-mobility.com" },
  { id: "7", name: "Paris", country: "FR", lat: 48.8566, lng: 2.3522, address: "5 Avenue des Champs-Elysees, Paris 75008, FR", email: "paris@vektor-mobility.com" },
  { id: "8", name: "Sydney", country: "AU", lat: -33.8688, lng: 151.2093, address: "100 George Street, Sydney NSW 2000, AU", email: "sydney@vektor-mobility.com" },
  { id: "9", name: "Dubai", country: "AE", lat: 25.2048, lng: 55.2708, address: "Sheikh Zayed Road, Dubai, AE", email: "dubai@vektor-mobility.com" },
  { id: "10", name: "Singapore", country: "SG", lat: 1.3521, lng: 103.8198, address: "1 Marina Boulevard, Singapore 018989, SG", email: "singapore@vektor-mobility.com" },
  { id: "12", name: "Sao Paulo", country: "BR", lat: -23.5505, lng: -46.6333, address: "Avenida Paulista, Sao Paulo 01310-100, BR", email: "saopaulo@vektor-mobility.com" },
  { id: "13", name: "Toronto", country: "CA", lat: 43.6532, lng: -79.3832, address: "100 Queen Street, Toronto ON M5H 2N2, CA", email: "toronto@vektor-mobility.com" },
  { id: "14", name: "Berlin", country: "DE", lat: 52.52, lng: 13.405, address: "Unter den Linden 77, Berlin 10117, DE", email: "berlin@vektor-mobility.com" },
  { id: "15", name: "Hong Kong", country: "HK", lat: 22.3193, lng: 114.1694, address: "1 Harbour Road, Hong Kong, HK", email: "hongkong@vektor-mobility.com" },
  { id: "16", name: "Los Angeles", country: "US", lat: 34.0522, lng: -118.2437, address: "100 Wilshire Blvd, Los Angeles CA 90012, US", email: "la@vektor-mobility.com" },
  { id: "17", name: "Barcelona", country: "ES", lat: 41.3851, lng: 2.1734, address: "Passeig de Gracia, Barcelona 08007, ES", email: "barcelona@vektor-mobility.com" },
  { id: "18", name: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041, address: "Dam Square 1, Amsterdam 1012 JS, NL", email: "amsterdam@vektor-mobility.com" },
  { id: "19", name: "Seoul", country: "KR", lat: 37.5665, lng: 126.978, address: "Gangnam-gu, Seoul 06236, KR", email: "seoul@vektor-mobility.com" },
  { id: "20", name: "Istanbul", country: "TR", lat: 41.0082, lng: 28.9784, address: "Taksim Square, Istanbul 34437, TR", email: "istanbul@vektor-mobility.com" },
];

export type InteractiveGlobeExplorerProps = {
  locations?: GlobeLocation[];
  initialLocationId?: string;
  globeTextureUrl?: string;
  className?: string;
};

type TooltipPosition = {
  x: number;
  y: number;
  mobile: boolean;
};

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState(480);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth || 500;
      const h = el.clientHeight || 500;
      const computed = Math.min(w, h, 600);
      setSize(Math.max(300, computed));
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function InteractiveGlobeExplorer({
  locations: initialLocations = DEFAULT_LOCATIONS,
  initialLocationId = "11", // Default to India
  globeTextureUrl = "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  className,
}: InteractiveGlobeExplorerProps) {
  const [locations, setLocations] = React.useState<GlobeLocation[]>(initialLocations);
  const [userLocation, setUserLocation] = React.useState<GlobeLocation | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationStatus, setLocationStatus] = React.useState<string | null>(null);

  const initialLocation =
    locations.find((l) => l.id === initialLocationId) ?? locations[0];

  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const locationRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const globeSize = useElementSize(containerRef);

  const [search, setSearch] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState<GlobeLocation | null>(null);
  const [activeLocationId, setActiveLocationId] = React.useState(initialLocation.id);
  const [tooltipPosition, setTooltipPosition] = React.useState<TooltipPosition>({ x: 0, y: 0, mobile: false });
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const filteredLocations = React.useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.country?.toLowerCase().includes(q)
    );
  }, [locations, search]);

  const focusGlobe = React.useCallback((location: GlobeLocation, ms = 900) => {
    globeRef.current?.pointOfView(
      { lat: location.lat, lng: location.lng, altitude: 2.2 },
      ms,
    );
  }, []);

  const handleGlobeReady = React.useCallback(() => {
    focusGlobe(initialLocation, 1200);
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    }
  }, [focusGlobe, initialLocation]);

  // Initial scroll to active location
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const el = locationRefs.current[activeLocationId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [activeLocationId]);

  // Current Location Detection via W3C Geolocation API & Reverse Geocoding
  const handleDetectLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Locating via GPS...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let placeName = "Current Location";
        let countryCode = "GPS";
        let displayAddress = `GPS: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

        try {
          // Zero-key resilient geocode with fallback
          const geoResult = await reverseGeocode(lat, lng);
          if (geoResult) {
            placeName = geoResult.placeName;
            countryCode = geoResult.countryCode;
            displayAddress = geoResult.formattedAddress;
          }
        } catch {
          // Keep GPS coordinates on fallback
        }

        const detected: GlobeLocation = {
          id: "user-gps-loc",
          name: `${placeName} (You)`,
          country: countryCode,
          lat,
          lng,
          address: displayAddress,
          email: "user@vektor-mobility.com",
          isUserLocation: true,
        };

        setUserLocation(detected);
        setLocations((prev) => {
          const filtered = prev.filter((p) => p.id !== "user-gps-loc");
          return [detected, ...filtered];
        });
        setActiveLocationId("user-gps-loc");
        setSelectedLocation(detected);
        focusGlobe(detected, 1200);
        setIsLocating(false);
        setLocationStatus(`Found: ${placeName}`);
        setTimeout(() => setLocationStatus(null), 3000);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("Permission denied. Allow location in browser.");
        } else {
          setLocationStatus("Unable to detect coordinates.");
        }
        setTimeout(() => setLocationStatus(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [focusGlobe]);

  const handleLocationClick = React.useCallback(
    (location: GlobeLocation, event: React.MouseEvent<HTMLElement>) => {
      setActiveLocationId(location.id);
      setSelectedLocation(location);
      setCopiedField(null);

      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 320;
      const mobile = viewportWidth < 768;
      let x = rect.right + 20;

      if (x + tooltipWidth > viewportWidth - 20) {
        x = Math.max(20, rect.left - tooltipWidth - 20);
      }

      setTooltipPosition({
        x: Math.max(20, x),
        y: Math.min(window.innerHeight - 200, Math.max(80, rect.top + rect.height / 2)),
        mobile,
      });

      focusGlobe(location, 1000);
    },
    [focusGlobe],
  );

  const handlePointClick = React.useCallback(
    (point: object) => {
      const location = locations.find((item) => item.id === (point as GlobeLocation).id);
      if (!location) return;

      setActiveLocationId(location.id);
      setSelectedLocation(location);
      focusGlobe(location, 800);

      locationRefs.current[location.id]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    },
    [focusGlobe, locations],
  );

  const copyToClipboard = React.useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    });
  }, []);

  return (
    <div className={cn("globe-shell", className)}>
      {/* Sidebar: City selector & search */}
      <div className="globe-city-list-pane">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
              Metropolitan Nodes
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
              <Sparkles size={11} className="text-amber-300" /> {locations.length} Connected
            </span>
          </div>

          {/* Current location trigger pill */}
          <div className="mb-2.5">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600/30 to-sky-600/30 hover:from-emerald-600/40 hover:to-sky-600/40 border border-emerald-400/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 size={14} className="animate-spin text-emerald-300" />
                  <span>Locating via GPS...</span>
                </>
              ) : (
                <>
                  <LocateFixed size={14} className="text-emerald-400" />
                  <span>Use My Current Location</span>
                </>
              )}
            </button>
            {locationStatus && (
              <p className="text-[11px] text-center mt-1 text-emerald-400 font-medium animate-pulse">
                {locationStatus}
              </p>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hubs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/60 focus:bg-white/10 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div ref={scrollContainerRef} className="globe-scroll-area">
          {filteredLocations.map((location) => {
            const isActive = activeLocationId === location.id;
            const isUser = location.isUserLocation;

            return (
              <button
                key={location.id}
                ref={(el) => {
                  locationRefs.current[location.id] = el;
                }}
                type="button"
                onClick={(e) => handleLocationClick(location, e)}
                className={cn(
                  "globe-city-button",
                  isActive && "is-active",
                  isUser && "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isUser ? (
                    <MapPin size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <span className={cn(
                      "w-2 h-2 rounded-full transition-transform shrink-0",
                      isActive ? "bg-sky-400 scale-125 shadow-[0_0_8px_#38bdf8]" : "bg-slate-600"
                    )} />
                  )}
                  <span className={cn(
                    "text-sm font-semibold",
                    isUser ? "text-emerald-300 font-bold" : "text-white/90"
                  )}>
                    {location.name}
                  </span>
                </div>
                {location.country && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    isUser
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                      : isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "bg-white/5 text-slate-400"
                  )}>
                    {location.country}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Globe Viewport */}
      <div ref={containerRef} className="globe-canvas-pane">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030a16] via-transparent to-transparent opacity-60 z-10" />
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/15" />
        </div>

        <div className="pointer-events-auto relative">
          <Globe
            ref={globeRef}
            width={globeSize}
            height={globeSize}
            globeImageUrl={globeTextureUrl}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={true}
            atmosphereColor="#38bdf8"
            atmosphereAltitude={0.16}
            pointsData={locations}
            pointLat="lat"
            pointLng="lng"
            pointColor={(d: object) => (d as GlobeLocation).isUserLocation ? "#10b981" : "#38bdf8"}
            pointAltitude={(d: object) => (d as GlobeLocation).isUserLocation ? 0.05 : 0.02}
            pointRadius={(d: object) => (d as GlobeLocation).isUserLocation ? 1.0 : 0.65}
            pointLabel={() => ""}
            onGlobeReady={handleGlobeReady}
            onPointClick={handlePointClick}
            enablePointerInteraction
            animateIn
          />
        </div>
      </div>

      {/* Floating Detail Card */}
      {selectedLocation && (
        <>
          <button
            type="button"
            aria-label="Close location details"
            className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSelectedLocation(null)}
          />

          <div
            className={cn(
              "fixed z-50 w-80 overflow-hidden rounded-2xl border bg-[#07152b]/95 p-4 shadow-2xl backdrop-blur-xl text-white",
              selectedLocation.isUserLocation ? "border-emerald-500/50 shadow-emerald-950/40" : "border-sky-500/30",
              tooltipPosition.mobile && "left-1/2 -translate-x-1/2 bottom-8 top-auto"
            )}
            style={
              tooltipPosition.mobile
                ? {}
                : {
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: "translateY(-50%)",
                  }
            }
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-3">
              <div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider",
                  selectedLocation.isUserLocation ? "text-emerald-400" : "text-sky-400"
                )}>
                  {selectedLocation.isUserLocation ? "Detected GPS Coordinates" : "Active Metropolitan Node"}
                </span>
                <h4 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  <Navigation2 size={16} className={selectedLocation.isUserLocation ? "text-emerald-400 fill-emerald-400" : "text-sky-400 fill-sky-400"} />
                  {selectedLocation.name}
                  {selectedLocation.country && (
                    <span className="text-xs font-normal text-slate-400">({selectedLocation.country})</span>
                  )}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-white text-sm px-1.5 py-0.5 rounded-lg hover:bg-white/10"
              >
                âœ•
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 truncate max-w-[210px]">{selectedLocation.address}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={() => copyToClipboard(selectedLocation.address, "addr")}
                >
                  {copiedField === "addr" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-sky-300 truncate max-w-[210px]">{selectedLocation.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={() => copyToClipboard(selectedLocation.email, "email")}
                >
                  {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Lat: {selectedLocation.lat.toFixed(2)}Â°, Lng: {selectedLocation.lng.toFixed(2)}Â°</span>
              <a
                href="/plan"
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-bold",
                  selectedLocation.isUserLocation ? "text-emerald-400 hover:text-emerald-300" : "text-sky-400 hover:text-sky-300"
                )}
              >
                Plan Route <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InteractiveGlobeExplorer;

