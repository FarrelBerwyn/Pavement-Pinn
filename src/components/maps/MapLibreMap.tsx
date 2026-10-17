import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 loads its worker from a separate module. Resolving it through the bundler keeps
// the URL correct in the dev server (pre-bundled dependencies) and in the production build.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { AlertTriangle } from 'lucide-react';
import { LeafletMap, type LeafletMapProps } from './LeafletMap';
import type { DamageReport, RoadSegment } from '../../types';
import { INITIAL_TILE_HEALTH, TileHealth, recordTileError, recordTileLoad } from './basemap';
import { BasemapCandidate, basemapCandidates } from './vectorBasemap';
import { CLUSTER_MAX_ZOOM, SEGMENT_LINE_MIN_ZOOM, clusterByPixelDistance } from './mapDetail';
import { SEVERITY_COLOR, lngLatBounds, reportsToGeoJson, segmentsToGeoJson, toLngLat } from './mapGeoJson';
import { DEMO_DATA_LABEL, DEMO_DATA_NOTE } from '../../data/provenance';
import { selectRegularUserDensity } from '../../features/community-reports/reportDensity';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

/**
 * MapLibre counts zoom on 512 px tiles, the thresholds in mapDetail on 256 px tiles:
 * the same ground scale is one zoom level lower here.
 */
const ZOOM_OFFSET = 1;
const LINE_MIN_ZOOM = SEGMENT_LINE_MIN_ZOOM - ZOOM_OFFSET;
const REPORT_MAX_CLUSTER_ZOOM = CLUSTER_MAX_ZOOM - ZOOM_OFFSET;
/** Below this zoom a tap on empty map is navigation, not the start of a report. */
const PICK_POINT_MIN_ZOOM = 11;
/** Centre of the bundled demo data (Karawang), used when no device position is available. */
const DATA_REGION: [number, number] = [107.318, -6.305];
const INDONESIA: [number, number] = [118, -2.5];

const SEGMENT_SOURCE = 'pp-segments';
const REPORT_SOURCE = 'pp-reports';
const DENSITY_SOURCE = 'pp-report-density';
/** With the density layer on, individual reports appear again from this (256 px) zoom. */
const DENSITY_MARKER_MIN_ZOOM = 13;
const LAYER = {
  density: 'pp-density',
  casing: 'pp-segment-selected-casing',
  line: 'pp-segment-line',
  selected: 'pp-segment-selected',
  hit: 'pp-segment-hit'
} as const;

const LINE_WIDTH = (extra: number): unknown => [
  'interpolate',
  ['linear'],
  ['zoom'],
  8,
  2 + extra,
  12,
  4 + extra,
  16,
  7 + extra
];

function filterReports(reports: DamageReport[], activeFilter: string): DamageReport[] {
  return reports.filter((report) => {
    if (activeFilter === 'CRITICAL') return report.severity === 'CRITICAL';
    if (activeFilter === 'MODERATE') return report.severity === 'SEVERE' || report.severity === 'MODERATE';
    if (activeFilter === 'MINOR') return report.severity === 'LIGHT';
    return true;
  });
}

/**
 * Public map on MapLibre GL JS: one camera from the globe down to street level.
 *
 * Road segments and report density are style layers; reports and their count markers
 * are DOM markers grouped by on-screen distance, so a count always equals the number of
 * reports it stands for. If WebGL is not available the Leaflet map is rendered instead.
 */
const MapLibreMap: React.FC<LeafletMapProps> = (props) => {
  const {
    roadSegments,
    selectedSegment,
    onSelectSegment,
    communityReports = [],
    activeFilter = 'ALL',
    showDensity = false,
    language = 'id',
    baseMapStyle = 'LIGHT',
    onSelectReport,
    onSelectCluster,
    onViewportChange,
    onOpenReportModalWithLocation,
    recenterKey = 0,
    highlightReportId = null,
    mapCenterTarget = null,
    userLocation = null,
    bottomInsetPx = 0
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleReadyRef = useRef(false);
  const candidatesRef = useRef<BasemapCandidate[]>([]);
  const stageRef = useRef(0);
  const healthRef = useRef<TileHealth>(INITIAL_TILE_HEALTH);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickPopupRef = useRef<maplibregl.Popup | null>(null);
  const zoomBucketRef = useRef<number>(-1);
  const viewBeforeSelectionRef = useRef<{ center: maplibregl.LngLat; zoom: number } | null>(null);
  const mountedRef = useRef(false);

  const [unsupported, setUnsupported] = useState(false);
  const [basemapStage, setBasemapStage] = useState(0);

  // Latest props for handlers that are registered once
  const latest = useRef({
    roadSegments,
    selectedSegment,
    onSelectSegment,
    reports: filterReports(communityReports, activeFilter),
    densityReports: selectRegularUserDensity(communityReports, activeFilter).reports,
    showDensity,
    language,
    onSelectReport,
    onSelectCluster,
    onViewportChange,
    onOpenReportModalWithLocation,
    highlightReportId,
    bottomInsetPx
  });
  latest.current = {
    roadSegments,
    selectedSegment,
    onSelectSegment,
    reports: filterReports(communityReports, activeFilter),
    densityReports: selectRegularUserDensity(communityReports, activeFilter).reports,
    showDensity,
    language,
    onSelectReport,
    onSelectCluster,
    onViewportChange,
    onOpenReportModalWithLocation,
    highlightReportId,
    bottomInsetPx
  };

  const applyCandidate = (index: number) => {
    const map = mapRef.current;
    const candidate = candidatesRef.current[index];
    if (!map || !candidate) return;
    stageRef.current = index;
    styleReadyRef.current = false;
    healthRef.current = INITIAL_TILE_HEALTH;
    setBasemapStage(index);
    map.setStyle(candidate.style as maplibregl.StyleSpecification | string, { diff: false });
  };

  const tryNextCandidate = () => {
    if (stageRef.current < candidatesRef.current.length - 1) applyCandidate(stageRef.current + 1);
  };

  const renderMarkers = () => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const { reports, showDensity: densityOn, language: lang, highlightReportId: highlighted } = latest.current;
    // Density hides the markers at area scale; closer in, the individual reports come back
    if (densityOn && map.getZoom() + ZOOM_OFFSET < DENSITY_MARKER_MIN_ZOOM) return;

    const clusters = clusterByPixelDistance(reports, (report) => report.coordinates, map.getZoom() + ZOOM_OFFSET);
    for (const cluster of clusters) {
      const element = document.createElement('button');
      element.type = 'button';
      element.style.cssText =
        'padding:0;border:2px solid #ffffff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(15,23,42,0.35);';

      if (cluster.items.length > 1) {
        const count = cluster.items.length;
        const size = count >= 10 ? 44 : count >= 5 ? 38 : 32;
        const label =
          lang === 'en'
            ? `${count} reports here (a count of reports, not a damage level)`
            : `${count} laporan di sini (jumlah laporan, bukan tingkat kerusakan)`;
        element.className = 'report-cluster-marker';
        element.setAttribute('aria-label', label);
        element.title = label;
        element.textContent = String(count);
        element.style.cssText += `width:${size}px;height:${size}px;background:#1e293b;color:#ffffff;font:700 13px system-ui,-apple-system,sans-serif;`;
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          const bounds = lngLatBounds(cluster.items.map((report) => report.coordinates));
          if (!bounds) return;
          const samePosition = bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1];
          if (samePosition && latest.current.onSelectCluster) {
            latest.current.onSelectCluster(cluster.items);
            return;
          }
          map.fitBounds(bounds, { padding: 70, maxZoom: REPORT_MAX_CLUSTER_ZOOM, duration: 900 });
        });
      } else {
        const report = cluster.items[0];
        const color = report.status === 'REPAIRED' ? '#57ae78' : SEVERITY_COLOR[report.severity];
        const isHighlighted = report.id === highlighted;
        element.className = 'report-marker';
        element.dataset.reportId = report.id;
        element.setAttribute('aria-label', `${report.damageTypeLabel} (${report.id})`);
        element.title = report.damageTypeLabel;
        element.style.cssText += `width:22px;height:22px;background:${color};${
          isHighlighted ? `box-shadow:0 0 0 3px #ffffff,0 0 0 5px ${color};` : ''
        }`;
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          latest.current.onSelectReport?.(report);
        });
      }

      markersRef.current.push(
        new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(toLngLat(cluster.center)).addTo(map)
      );
    }
  };

  const syncLayers = () => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const segmentSource = map.getSource(SEGMENT_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const reportSource = map.getSource(REPORT_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!segmentSource || !reportSource) return;
    const { roadSegments: segments, reports, showDensity: densityOn, selectedSegment: selected } = latest.current;
    segmentSource.setData(segmentsToGeoJson(segments) as never);
    reportSource.setData(reportsToGeoJson(reports) as never);
    (map.getSource(DENSITY_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(
      reportsToGeoJson(latest.current.densityReports) as never
    );
    map.setLayoutProperty(LAYER.density, 'visibility', densityOn ? 'visible' : 'none');
    const selectedFilter = ['==', ['get', 'id'], selected?.id ?? ''] as never;
    map.setFilter(LAYER.casing, selectedFilter);
    map.setFilter(LAYER.selected, selectedFilter);
  };

  const installLayers = () => {
    const map = mapRef.current;
    if (!map) return;
    // Below the first label layer, so place and road names stay readable on top of the data
    const beforeId = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
    const empty = { type: 'FeatureCollection', features: [] } as never;
    map.addSource(SEGMENT_SOURCE, { type: 'geojson', data: empty });
    map.addSource(REPORT_SOURCE, { type: 'geojson', data: empty });
    map.addSource(DENSITY_SOURCE, { type: 'geojson', data: empty });

    map.addLayer(
      {
        id: LAYER.density,
        type: 'heatmap',
        source: DENSITY_SOURCE,
        layout: { visibility: 'none' },
        paint: {
          // Uniform weight: the layer shows how many reports there are, not how severe they are
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 12, 1.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 8, 26, 14, 48],
          // Fades as individual reports take over at street scale
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 14, 0.3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(6,182,212,0)',
            0.2,
            '#8296b0',
            0.4,
            '#57ae78',
            0.6,
            '#e8b23a',
            0.8,
            '#e2823d',
            1,
            '#d9655d'
          ]
        }
      } as never,
      beforeId
    );

    const lineLayout = { 'line-cap': 'round', 'line-join': 'round' };
    const noSelection = ['==', ['get', 'id'], ''];
    map.addLayer(
      {
        id: LAYER.casing,
        type: 'line',
        source: SEGMENT_SOURCE,
        minzoom: LINE_MIN_ZOOM,
        filter: noSelection,
        layout: lineLayout,
        paint: { 'line-color': '#ffffff', 'line-width': LINE_WIDTH(7) }
      } as never,
      beforeId
    );
    map.addLayer(
      {
        id: LAYER.line,
        type: 'line',
        source: SEGMENT_SOURCE,
        minzoom: LINE_MIN_ZOOM,
        layout: lineLayout,
        paint: { 'line-color': ['get', 'color'], 'line-width': LINE_WIDTH(0), 'line-opacity': 0.9 }
      } as never,
      beforeId
    );
    map.addLayer(
      {
        id: LAYER.selected,
        type: 'line',
        source: SEGMENT_SOURCE,
        minzoom: LINE_MIN_ZOOM,
        filter: noSelection,
        layout: lineLayout,
        paint: { 'line-color': ['get', 'color'], 'line-width': LINE_WIDTH(2) }
      } as never,
      beforeId
    );
    // Wide, practically invisible line so a segment can be tapped on a touch screen
    map.addLayer({
      id: LAYER.hit,
      type: 'line',
      source: SEGMENT_SOURCE,
      minzoom: LINE_MIN_ZOOM,
      layout: lineLayout,
      paint: { 'line-color': '#000000', 'line-opacity': 0.001, 'line-width': 24 }
    } as never);
  };

  const showPickPopup = (lngLat: maplibregl.LngLat) => {
    const map = mapRef.current;
    const { roadSegments: segments, onOpenReportModalWithLocation: openReport, language: lang } = latest.current;
    if (!map || !openReport || segments.length === 0) return;
    pickPopupRef.current?.remove();

    const point: [number, number] = [Number(lngLat.lat.toFixed(6)), Number(lngLat.lng.toFixed(6))];
    let nearest: RoadSegment = segments[0];
    let best = Infinity;
    for (const segment of segments) {
      const distance = Math.hypot(segment.coordinates[0] - point[0], segment.coordinates[1] - point[1]);
      if (distance < best) {
        best = distance;
        nearest = segment;
      }
    }

    const content = document.createElement('div');
    content.style.cssText = 'font:12px system-ui,-apple-system,sans-serif;color:#0f172a;min-width:190px;';
    const position = document.createElement('p');
    position.style.cssText = 'margin:0 0 2px;font-weight:700;';
    position.textContent = `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`;
    const near = document.createElement('p');
    near.style.cssText = 'margin:0 0 8px;color:#475569;font-size:11px;';
    near.textContent = `${lang === 'en' ? 'Nearest segment' : 'Ruas terdekat'}: ${nearest.name}`;
    const action = document.createElement('button');
    action.type = 'button';
    action.style.cssText =
      'width:100%;padding:7px 10px;border:0;border-radius:8px;background:#0f172a;color:#ffffff;font-weight:700;font-size:12px;cursor:pointer;';
    action.textContent = lang === 'en' ? 'Report damage at this point' : 'Laporkan kerusakan di titik ini';
    action.addEventListener('click', () => {
      pickPopupRef.current?.remove();
      openReport(nearest, point);
    });
    content.append(position, near, action);

    pickPopupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '260px', offset: 6 })
      .setLngLat(lngLat)
      .setDOMContent(content)
      .addTo(map);
  };

  // Create the map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    candidatesRef.current = basemapCandidates(baseMapStyle, import.meta.env.VITE_MAPTILER_KEY);
    const shortSide = Math.max(240, Math.min(container.clientWidth || 375, container.clientHeight || 600));
    // Zoom at which the globe is a little narrower than the short side of the map
    const globeZoom = Math.log2((shortSide * 0.9 * Math.PI) / 512);

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: candidatesRef.current[0].style as maplibregl.StyleSpecification | string,
        center: INDONESIA,
        zoom: globeZoom,
        attributionControl: { compact: true }
      });
    } catch {
      // No WebGL: the Leaflet map takes over
      setUnsupported(true);
      return;
    }
    mapRef.current = map;
    // Development only: lets browser checks compare marker positions with projected coordinates
    if (import.meta.env.DEV) (window as unknown as { __pavementMap?: maplibregl.Map }).__pavementMap = map;

    const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (coarsePointer) {
      // No on-screen compass on phones, so the map stays north-up and flat there
      map.touchZoomRotate.disableRotation();
      map.touchPitch.disable();
    } else {
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
    }

    const reportViewport = (moving: boolean) => {
      const bounds = map.getBounds();
      latest.current.onViewportChange?.({
        zoom: map.getZoom() + ZOOM_OFFSET,
        bounds: [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()]
        ],
        moving
      });
    };

    map.on('style.load', () => {
      styleReadyRef.current = true;
      map.setProjection({ type: 'globe' });
      installLayers();
      syncLayers();
      renderMarkers();
      reportViewport(false);
    });

    map.on('error', (event) => {
      const sourceId = (event as { sourceId?: string }).sourceId;
      if (!styleReadyRef.current) {
        // The style itself could not be loaded
        tryNextCandidate();
        return;
      }
      if (!sourceId || sourceId.startsWith('pp-')) return;
      const previous = healthRef.current;
      healthRef.current = recordTileError(previous);
      if (healthRef.current.stage !== previous.stage) tryNextCandidate();
    });

    map.on('sourcedata', (event) => {
      const { sourceId, tile } = event as { sourceId?: string; tile?: unknown };
      if (tile && sourceId && !sourceId.startsWith('pp-')) healthRef.current = recordTileLoad(healthRef.current);
    });

    map.on('movestart', () => reportViewport(true));
    map.on('moveend', () => reportViewport(false));
    map.on('zoom', () => {
      // Regroup markers every half zoom level, not on every animation frame
      const bucket = Math.round(map.getZoom() * 2);
      if (bucket !== zoomBucketRef.current) {
        zoomBucketRef.current = bucket;
        renderMarkers();
      }
    });

    map.on('click', (event) => {
      if (!styleReadyRef.current) return;
      const hits = map.getLayer(LAYER.hit) ? map.queryRenderedFeatures(event.point, { layers: [LAYER.hit] }) : [];
      const hitId = hits[0]?.properties?.id as string | undefined;
      const segment = hitId ? latest.current.roadSegments.find((s) => s.id === hitId) : undefined;
      if (segment) {
        pickPopupRef.current?.remove();
        latest.current.onSelectSegment(segment);
        return;
      }
      // With density on, a tap on the area zooms towards the reports there
      if (latest.current.showDensity && map.getZoom() + ZOOM_OFFSET < DENSITY_MARKER_MIN_ZOOM) {
        map.easeTo({ center: event.lngLat, zoom: Math.min(map.getZoom() + 2, DENSITY_MARKER_MIN_ZOOM - ZOOM_OFFSET), duration: 600 });
        return;
      }
      if (map.getZoom() >= PICK_POINT_MIN_ZOOM) showPickPopup(event.lngLat);
    });
    map.on('mouseenter', LAYER.hit, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', LAYER.hit, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current = null;
      styleReadyRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Data, filter, layer and selection changes: never a new map, never a camera move
  useEffect(() => {
    syncLayers();
    renderMarkers();
  }, [roadSegments, communityReports, activeFilter, showDensity, selectedSegment, highlightReportId, language]);

  // Basemap choice
  useEffect(() => {
    if (!mountedRef.current || !mapRef.current) return;
    candidatesRef.current = basemapCandidates(baseMapStyle, import.meta.env.VITE_MAPTILER_KEY);
    applyCandidate(0);
  }, [baseMapStyle]);

  // Selected segment: framed above an open sheet, and the earlier view restored when it closes
  const hasBottomInset = bottomInsetPx > 0;
  useEffect(() => {
    const map = mapRef.current;
    if (!mountedRef.current || !map || !selectedSegment) return;

    if (hasBottomInset) {
      if (!viewBeforeSelectionRef.current) {
        viewBeforeSelectionRef.current = { center: map.getCenter(), zoom: map.getZoom() };
      }
      const bounds = lngLatBounds(
        selectedSegment.polyline.length > 1 ? selectedSegment.polyline : [selectedSegment.coordinates]
      );
      if (bounds) {
        map.fitBounds(bounds, {
          padding: { top: 130, left: 36, right: 36, bottom: bottomInsetPx + 24 },
          maxZoom: 14,
          duration: 900
        });
      }
      return;
    }

    if (viewBeforeSelectionRef.current) {
      const previous = viewBeforeSelectionRef.current;
      viewBeforeSelectionRef.current = null;
      map.easeTo({ center: previous.center, zoom: previous.zoom, duration: 600 });
      return;
    }

    // No sheet over the map (wide screens): bring the segment into view without zooming out
    map.flyTo({ center: toLngLat(selectedSegment.coordinates), zoom: Math.max(map.getZoom(), 11), duration: 1200 });
  }, [selectedSegment, hasBottomInset]);

  // Locate without a device position: back to the region the demo data covers
  useEffect(() => {
    if (recenterKey > 0) mapRef.current?.flyTo({ center: DATA_REGION, zoom: 11, duration: 1400 });
  }, [recenterKey]);

  // Device position, only when the Geolocation API returned one
  useEffect(() => {
    const map = mapRef.current;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!map || !userLocation) return;
    const element = document.createElement('div');
    element.className = 'user-location-marker';
    element.style.cssText =
      'width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(59,130,246,0.2);';
    userMarkerRef.current = new maplibregl.Marker({ element, anchor: 'center' })
      .setLngLat(toLngLat(userLocation.coordinates))
      .addTo(map);
    map.flyTo({ center: toLngLat(userLocation.coordinates), zoom: Math.max(map.getZoom(), 14), duration: 1400 });
  }, [userLocation]);

  // Explicit camera target (a report chosen from a list, a newly created report)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapCenterTarget) return;
    const narrow = typeof window !== 'undefined' && window.innerWidth < 768;
    map.flyTo({
      center: toLngLat(mapCenterTarget.coords),
      zoom: (mapCenterTarget.zoom ?? 17) - ZOOM_OFFSET,
      // Keep the point in the part of the map a half-open sheet leaves visible
      offset: narrow ? [0, -150] : [0, 0],
      duration: 1400
    });
  }, [mapCenterTarget]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (unsupported) return <LeafletMap {...props} />;

  const stageProvider = candidatesRef.current[basemapStage]?.provider;

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-[#0b1220]">
      {/* MapLibre sets position: relative on its container, so the size comes from width/height */}
      <div ref={containerRef} data-testid="vector-map" className="w-full h-full" />

      {/* Provenance: everything drawn on this map comes from the bundled demo datasets */}
      <div
        data-testid="demo-data-badge"
        title={DEMO_DATA_NOTE[language]}
        className="absolute bottom-1 left-1 z-10 bg-slate-900/90 border border-amber-400/50 text-amber-300 text-xs font-semibold tracking-wide px-2 py-1 rounded-md"
      >
        {DEMO_DATA_LABEL[language]}
      </div>

      {/* Basemap status: shown only when the selected style could not be used */}
      {basemapStage > 0 && (
        <div
          role="status"
          data-testid="basemap-status"
          className="absolute bottom-[136px] md:bottom-16 left-1/2 -translate-x-1/2 z-20 w-max max-w-[calc(100%-1.5rem)] flex items-center gap-2 bg-slate-900/95 border border-amber-400/50 text-white text-xs font-bold px-3 py-2 rounded-2xl shadow-lg"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {stageProvider === 'NONE'
              ? language === 'en'
                ? 'Basemap unavailable. Map data is still shown.'
                : 'Peta dasar tidak tersedia. Data tetap ditampilkan.'
              : language === 'en'
              ? 'Backup basemap in use.'
              : 'Memakai peta dasar cadangan.'}
          </span>
          <button
            type="button"
            onClick={() => applyCandidate(0)}
            className="shrink-0 whitespace-nowrap underline text-amber-300 cursor-pointer"
          >
            {language === 'en' ? 'Retry' : 'Coba lagi'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MapLibreMap;
