/**
 * Minimal History-API router.
 *
 * The project had no router (navigation was component state), and the route table is
 * small and static, so a ~100-line in-house router is used instead of adding a routing
 * dependency. It is base-path aware (GitHub Pages serves the app under /PavementPinn/),
 * preserves query string and hash, and supports back/forward through `popstate`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeBasePath } from '../constants/deployment';
import {
  buildPath,
  LEGACY_REDIRECTS,
  matchRoute,
  normalizePath,
  RouteId,
  RouteMatch,
  stripBasePath,
  withBasePath
} from './routeConfig';

const BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);

export interface RouterLocation {
  /** Canonical app-relative path, e.g. `/engine/simulation/`. */
  path: string;
  /** Raw query string including the leading `?` (or empty). */
  search: string;
  hash: string;
}

export interface NavigateOptions {
  replace?: boolean;
}

export interface RouterValue {
  location: RouterLocation;
  /** Matched route, or null when the path is unknown (not-found). */
  match: RouteMatch | null;
  query: URLSearchParams;
  /** Navigate to an app-relative target (`/reports/`, `/login/?next=/policy/`). */
  navigate: (to: string, options?: NavigateOptions) => void;
  /** Navigate by route id. */
  navigateTo: (id: RouteId, params?: Record<string, string>, options?: NavigateOptions) => void;
  /** Browser href (base path applied) for an app-relative target. */
  href: (to: string) => string;
}

function readLocation(): RouterLocation {
  return {
    path: stripBasePath(window.location.pathname, BASE_PATH),
    search: window.location.search,
    hash: window.location.hash
  };
}

function splitTarget(to: string): RouterLocation {
  const url = new URL(to, 'http://router.invalid');
  return { path: normalizePath(url.pathname), search: url.search, hash: url.hash };
}

const toHref = (target: RouterLocation) => `${withBasePath(target.path, BASE_PATH)}${target.search}${target.hash}`;

const RouterContext = createContext<RouterValue | null>(null);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<RouterLocation>(readLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    const target = splitTarget(to);
    const nextHref = toHref(target);
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextHref !== currentHref) {
      if (options?.replace) {
        window.history.replaceState(null, '', nextHref);
      } else {
        window.history.pushState(null, '', nextHref);
      }
    }
    setLocation((previous) =>
      previous.path === target.path && previous.search === target.search && previous.hash === target.hash
        ? previous
        : target
    );
  }, []);

  // Canonicalise the address bar: legacy aliases, missing trailing slash, paths outside the base.
  useEffect(() => {
    const redirect = LEGACY_REDIRECTS[location.path];
    if (redirect) {
      navigate(`${redirect}${location.search}${location.hash}`, { replace: true });
      return;
    }
    const canonical = toHref(location);
    const actual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (canonical !== actual) window.history.replaceState(null, '', canonical);
  }, [location, navigate]);

  const value = useMemo<RouterValue>(() => {
    return {
      location,
      match: matchRoute(location.path),
      query: new URLSearchParams(location.search),
      navigate,
      navigateTo: (id, params, options) => navigate(buildPath(id, params), options),
      href: (to) => toHref(splitTarget(to))
    };
  }, [location, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside <RouterProvider>');
  return value;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

/** Anchor that navigates client-side; modified clicks (new tab etc.) keep native behaviour. */
export const Link: React.FC<LinkProps> = ({ to, replace, onClick, children, ...rest }) => {
  const { navigate, href } = useRouter();
  return (
    <a
      {...rest}
      href={href(to)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        navigate(to, { replace });
      }}
    >
      {children}
    </a>
  );
};
