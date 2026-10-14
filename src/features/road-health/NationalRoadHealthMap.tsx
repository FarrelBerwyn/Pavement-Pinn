import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { recoverMapSize, safeFitBounds } from '../../components/maps/mapViewport';
import {
  NATIONAL_ROAD_HEALTH_CORRIDORS,
  NationalRoadCorridor,
  getRhiStatusAndColor
} from './nationalRoadHealthData';
import { Plus, Minus, Layers, Info, ExternalLink, RefreshCw } from 'lucide-react';

interface NationalRoadHealthMapProps {
  onNavigateToMap?: () => void;
  onSelectCorridor?: (corridor: NationalRoadCorridor) => void;
}

export const NationalRoadHealthMap: React.FC<NationalRoadHealthMapProps> = ({
  onNavigateToMap,
  onSelectCorridor
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const roadLayersGroupRef = useRef<L.FeatureGroup | null>(null);
  
  const [activeBaseLayer, setActiveBaseLayer] = useState<'CARTO_LIGHT' | 'OSM_STANDARD'>('CARTO_LIGHT');
  const [selectedCorridorInfo, setSelectedCorridorInfo] = useState<NationalRoadCorridor | null>(null);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [activeIslandFilter, setActiveIslandFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet Map centered on Indonesia Archipelago
    const map = L.map(mapContainerRef.current, {
      center: [-2.2, 118.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false, // Custom styled zoom controls
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Add Light GIS Tile Layer (OpenStreetMap standard)
    const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(osmUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Feature group for road polylines
    const roadGroup = L.featureGroup().addTo(map);
    roadLayersGroupRef.current = roadGroup;

    // Render all national road network polylines
    renderCorridors(map, roadGroup, activeIslandFilter);

    // Initial bounds fit to Indonesia archipelago
    const indonesiaBounds = L.latLngBounds(
      [-10.8, 95.0], // Southwest (below Timor/Java/Sumatra)
      [5.9, 141.0]   // Northeast (above Aceh/Papua border)
    );
    safeFitBounds(map, indonesiaBounds, {
      padding: [20, 20],
      maxZoom: 6
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        recoverMapSize(mapInstanceRef.current);
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update corridors when filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !roadLayersGroupRef.current) return;
    renderCorridors(mapInstanceRef.current, roadLayersGroupRef.current, activeIslandFilter);
  }, [activeIslandFilter]);

  // Function to render polylines on the map
  const renderCorridors = (map: L.Map, group: L.FeatureGroup, islandFilter: string) => {
    group.clearLayers();

    const filteredCorridors = islandFilter === 'ALL'
      ? NATIONAL_ROAD_HEALTH_CORRIDORS
      : NATIONAL_ROAD_HEALTH_CORRIDORS.filter(c => c.island === islandFilter);

    filteredCorridors.forEach((corridor) => {
      const { color, lineWeight } = getRhiStatusAndColor(corridor.rhi);

      // Background casing line for high contrast
      const casing = L.polyline(corridor.polyline, {
        color: '#ffffff',
        weight: lineWeight + 3,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });
      casing.addTo(group);

      // Main colored polyline
      const polyline = L.polyline(corridor.polyline, {
        color: color,
        weight: lineWeight,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Hover and Click interactions
      polyline.on('mouseover', function () {
        this.setStyle({
          weight: lineWeight + 2.5,
          opacity: 1
        });
      });

      polyline.on('mouseout', function () {
        this.setStyle({
          weight: lineWeight,
          opacity: 0.95
        });
      });

      polyline.on('click', () => {
        setSelectedCorridorInfo(corridor);
        if (onSelectCorridor) onSelectCorridor(corridor);
      });

      // Custom HTML Popup
      const statusBadgeBg =
        corridor.rhi >= 70
          ? 'background:#dcfce7; color:#15803d;'
          : corridor.rhi >= 50
          ? 'background:#fef9c3; color:#a16207;'
          : corridor.rhi >= 30
          ? 'background:#ffedd5; color:#c2410c;'
          : 'background:#ffe4e6; color:#be123c;';

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; min-width: 210px; line-height: 1.4; color: #1e293b; padding: 4px;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color: #0f172a;">
            ${corridor.name}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: #64748b;">${corridor.island} • ${corridor.corridorType}</span>
            <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-weight: 700; font-size: 10px; ${statusBadgeBg}">
              ${corridor.status} (RHI ${corridor.rhi})
            </span>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 11px; color: #475569;">
            <div>📏 <b>Panjang:</b> ${corridor.lengthKm} km</div>
            <div>🚚 <b>Beban Gandar:</b> ${corridor.axleLoadTon} Ton (+${corridor.overloadPercent}% ODOL)</div>
            <div>🛠️ <b>Rekomendasi:</b> ${corridor.treatment}</div>
          </div>
        </div>
      `;

      polyline.bindPopup(popupHtml, {
        closeButton: true,
        className: 'custom-leaflet-popup'
      });

      polyline.addTo(group);
    });
  };

  // Zoom In / Out Handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleResetBounds = () => {
    if (mapInstanceRef.current) {
      const indonesiaBounds = L.latLngBounds(
        [-10.8, 95.0],
        [5.9, 141.0]
      );
      safeFitBounds(mapInstanceRef.current, indonesiaBounds, {
        padding: [20, 20],
        maxZoom: 6
      });
    }
  };

  const handleChangeBaseMap = (layer: 'CARTO_LIGHT' | 'OSM_STANDARD') => {
    if (!mapInstanceRef.current) return;
    setActiveBaseLayer(layer);
    setIsLayerMenuOpen(false);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const url =
      layer === 'CARTO_LIGHT'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(url, {
      attribution:
        layer === 'CARTO_LIGHT'
          ? '&copy; <a href="https://www.esri.com/">Esri</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;

    // Bring road layers to top
    if (roadLayersGroupRef.current) {
      roadLayersGroupRef.current.bringToFront();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Card Header matching screenshot */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-1.5 text-slate-800 font-extrabold text-sm sm:text-base">
          <span>Peta Kesehatan Jalan Nasional</span>
          <Info className="w-4 h-4 text-slate-400 cursor-help" />
        </div>

        {/* Island filter pills */}
        <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'Sumatera', label: 'Sumatera' },
            { id: 'Jawa', label: 'Jawa' },
            { id: 'Kalimantan', label: 'Kalimantan' },
            { id: 'Sulawesi', label: 'Sulawesi' },
            { id: 'Papua', label: 'Papua' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveIslandFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeIslandFilter === item.id
                  ? 'bg-white text-amber-600 shadow-xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[340px] sm:h-[380px] lg:h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-[#f1f5f9]">
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Map Controls Top-Left (Exact from screenshot) */}
        <div className="absolute top-3 left-3 flex flex-col bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden z-20">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-200 cursor-pointer"
            title="Perbesar Peta"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-200 cursor-pointer"
            title="Perkecil Peta"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-200 cursor-pointer"
            title="Ganti Lapisan GIS"
          >
            <Layers className="w-4 h-4 text-amber-600" />
          </button>
          <button
            onClick={handleResetBounds}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Kembali ke Pandangan Nasional"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Base Layer Switcher Dropdown */}
        {isLayerMenuOpen && (
          <div className="absolute top-3 left-14 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 w-44 space-y-1 text-xs font-semibold">
            <p className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Pilih Basemap GIS</p>
            <button
              onClick={() => handleChangeBaseMap('CARTO_LIGHT')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeBaseLayer === 'CARTO_LIGHT' ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              CartoDB Light GIS
            </button>
            <button
              onClick={() => handleChangeBaseMap('OSM_STANDARD')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeBaseLayer === 'OSM_STANDARD' ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              OpenStreetMap
            </button>
          </div>
        )}

        {/* Floating Legend Top-Right (Exact match from screenshot) */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-slate-200 z-20 text-[11px] font-semibold space-y-1.5 min-w-[150px]">
          <p className="text-slate-800 font-bold mb-1">Kesehatan Jalan (RHI)</p>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-1.5 bg-[#16a34a] rounded-full"></span>
            <span className="text-slate-700">Baik (≥ 70)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-1.5 bg-[#eab308] rounded-full"></span>
            <span className="text-slate-700">Sedang (50 - 69)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-1.5 bg-[#f97316] rounded-full"></span>
            <span className="text-slate-700">Buruk (30 - 49)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-1.5 bg-[#ef4444] rounded-full"></span>
            <span className="text-slate-700">Sangat Buruk (&lt; 30)</span>
          </div>
        </div>
      </div>

      {/* Map Footer Bar (Exact match from screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2 text-xs font-medium text-slate-500 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Sumber Data: PAVEMENT-PINN</span>
          <span>•</span>
          <span>Update terakhir: Hari ini, 10:24 WIB</span>
        </div>

        <button
          onClick={onNavigateToMap}
          className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Lihat Peta Interaktif</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>
    </div>
  );
};
