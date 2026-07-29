/**
 * 社区版图（Leaflet）
 *
 * Leaflet 是命令式 API，和 React 的声明式渲染混在一起容易打架，
 * 所以这里把它整体关在一个 effect 里：
 *   - 地图实例只建一次，成员变化时只重建标记图层
 *   - 标记的 popup 用 Leaflet 自己渲染，通过回调调用 React 的 openMember
 *   - Leaflet 与 markercluster 动态导入，不进首屏包
 */
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Member, SiteConfig } from "../content/types";
import { primaryRole } from "../content";
import "./CommunityMap.css";

interface CommunityMapProps {
  members: Member[];
  site: SiteConfig;
  onOpen: (id: string) => void;
  /** 被选中的成员：地图会飞过去 */
  focusId: string | null;
}

/** 同坐标多人时把标记散在小圆周上，约 120 米，避免完全重叠 */
const SPREAD_RADIUS = 0.0011;

function escapeHTML(str: string): string {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export function CommunityMap({ members, site, onOpen, focusId }: CommunityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  // Leaflet 命名空间存起来，标记图层的 effect 复用，不重复 import
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  // openMember 存在 ref 里：popup 的事件回调建立于挂载时，
  // 直接闭包捕获会拿到过期的函数
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  /* ---------- 建图（只跑一次） ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        // 聚合插件挂在 L 上，import 顺序必须在 leaflet 之后
        await import("leaflet.markercluster");
        await import("leaflet.markercluster/dist/MarkerCluster.css");

        if (cancelled || !containerRef.current) return;

        leafletRef.current = L;
        const map = L.map(containerRef.current, {
          // 滚轮缩放会劫持页面滚动，关掉；
          // 缩放交给右上角按钮、双击和移动端双指捏合。
          scrollWheelZoom: false,
          attributionControl: true,
          // 容器本身不进 Tab 流：它没有可执行的操作，聚焦上去只是
          // 一次看不出所以然的空停留。缩放按钮是独立的 <a>，仍可 Tab 到。
          keyboard: false,
        }).setView(site.map.center, site.map.zoom);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        setStatus("ready");
      } catch (err) {
        // 离线或 CDN 被墙时不要白屏，退回一句说明
        console.warn("[map] Leaflet 加载失败", err);
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // site.map 来自构建期常量，不会变；地图实例只建一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 画标记（成员列表变化时重建） ---------- */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !L || !map) return;

    const located = members.filter((m) => m.location !== null);

    // 先按坐标分组，判断哪些点需要散开
    const groups = new Map<string, Member[]>();
    for (const m of located) {
      const key = m.location!.join(",");
      const list = groups.get(key);
      if (list) list.push(m);
      else groups.set(key, [m]);
    }

    const hasCluster = typeof L.markerClusterGroup === "function";
    const layer = hasCluster
      ? L.markerClusterGroup({
          maxClusterRadius: 46,
          showCoverageOnHover: false,
          spiderfyDistanceMultiplier: 1.4,
          iconCreateFunction: (cluster) =>
            L.divIcon({
              className: "",
              html: `<div class="map-cluster">${cluster.getChildCount()}</div>`,
              iconSize: [40, 40],
            }),
        })
      : L.layerGroup();

    const markers: Record<string, Marker> = {};
    const bounds: [number, number][] = [];

    for (const member of located) {
      const role = primaryRole(member);
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" style="--pin-color:${role.color}">
                 <span>${escapeHTML(role.short)}</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
      });

      let latlng = member.location!;
      const group = groups.get(latlng.join(","))!;
      if (group.length > 1) {
        const i = group.indexOf(member);
        const angle = (2 * Math.PI * i) / group.length;
        latlng = [
          latlng[0] + SPREAD_RADIUS * Math.sin(angle),
          latlng[1] + SPREAD_RADIUS * Math.cos(angle),
        ];
      }

      const marker = L.marker(latlng, {
        icon,
        // 无障碍：读屏时标记有名字，不是一堆空 div
        alt: `${member.name} · ${member.city}`,
        // 标记不进 Tab 流：地图是下方名单的冗余视图，
        // 每个成员一个 Tab 停留点会让键盘用户按十几次才能走出地图。
        // 鼠标点击、读屏浏览模式都不受影响。
        keyboard: false,
      });

      marker.bindPopup(
        `<div class="map-popup" style="--pin-color:${role.color}">
           <strong>${escapeHTML(member.name)}</strong>
           <small>${escapeHTML(role.short)} · ${escapeHTML(member.city)}</small>
           <button type="button" data-member-id="${escapeHTML(member.id)}">查看详情</button>
         </div>`,
        { closeButton: true, className: "map-popup-wrap" }
      );

      marker.on("popupopen", (e) => {
        const btn = e.popup
          .getElement()
          ?.querySelector<HTMLButtonElement>("button[data-member-id]");
        btn?.addEventListener("click", () => {
          const id = btn.dataset.memberId;
          if (id) onOpenRef.current(id);
        });
      });

      layer.addLayer(marker);
      markers[member.id] = marker;
      bounds.push(member.location!);
    }

    map.addLayer(layer);
    markersRef.current = markers;

    // 成员跨国分布时自动取景，保证所有标记都在视野内
    if (site.map.autoFit && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: site.map.autoFitMaxZoom });
    }

    return () => {
      map.removeLayer(layer);
      markersRef.current = {};
    };
  }, [members, status, site.map.autoFit, site.map.autoFitMaxZoom]);

  /* ---------- 选中成员时飞过去 ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!focusId || status !== "ready" || !map) return;

    const marker = markersRef.current[focusId];
    if (!marker) return;

    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 6), { duration: 0.8 });
  }, [focusId, status]);

  /* ---------- 容器尺寸变化时重算 ----------
     父级会在筛选归零时用 hidden 收起整个区块。Leaflet 在
     display:none 期间量到的尺寸是 0，重新显示后必须
     invalidateSize()，否则瓦片只铺一角。 */
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (status !== "ready" || !map || !el) return;

    const observer = new ResizeObserver(() => {
      // 尺寸为 0 说明还在隐藏中，等真正显示了再算
      if (el.clientWidth > 0 && el.clientHeight > 0) map.invalidateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  if (status === "failed") {
    return (
      <div className="map-shell map-shell--fallback glass">
        <p>地图需要联网加载。当前网络不可用，成员信息仍可在下方名单中查看。</p>
      </div>
    );
  }

  return (
    <div className="map-shell glass">
      {/* 地图是名单的辅助视图，读屏用户从下方卡片墙就能拿到全部信息，
          所以这里只作分组标注，不用 role="application" 抢走读屏的按键。 */}
      <div
        ref={containerRef}
        className="map-canvas"
        role="group"
        aria-label="社区成员分布地图（同样的信息可在下方成员名单中查看）"
      />
      {status === "loading" && (
        <div className="map-loading" aria-live="polite">
          <span className="map-spinner" aria-hidden="true" />
          正在加载地图…
        </div>
      )}
      <p className="map-tip" aria-hidden="true">
        双击或用右上角按钮缩放
      </p>
    </div>
  );
}
