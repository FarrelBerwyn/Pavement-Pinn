import React from 'react';
import { Compass, Lock, MonitorSmartphone } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link, useRouter } from '../../app/router';
import { allowedRolesFor, buildPath, RouteDefinition } from '../../app/routeConfig';
import { homeRouteFor, loginPathFor } from '../../app/guards/routeAccess';

const cardClass = 'bg-[#121622] border border-white/10 rounded-3xl p-6 space-y-4 max-w-2xl';
const primaryLink = 'inline-block px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs';
const secondaryLink = 'inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-xs';

/** Unknown URL. */
export const NotFoundPage: React.FC = () => {
  const { currentAccount, closePage } = usePageContext();
  const { location } = useRouter();

  return (
    <PageOverlay icon={<Compass className="w-6 h-6" />} title="Halaman tidak ditemukan" subtitle="404 — Page not found" onBack={closePage}>
      <div className={cardClass}>
        <p className="text-sm text-slate-300">
          Alamat <code className="font-mono text-amber-300 break-all">{location.path}</code> tidak terdaftar di PAVEMENT-PINN.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={buildPath(homeRouteFor(currentAccount))} className={primaryLink}>
            Kembali ke beranda
          </Link>
          <Link to={buildPath('reports')} className={secondaryLink}>
            Laporan warga
          </Link>
          <Link to={buildPath('engine')} className={secondaryLink}>
            Engine
          </Link>
        </div>
      </div>
    </PageOverlay>
  );
};

/** Known URL, but the signed-in role is not allowed to open it. */
export const ForbiddenPage: React.FC<{ route: RouteDefinition }> = ({ route }) => {
  const { currentAccount, closePage } = usePageContext();
  const { location } = useRouter();

  return (
    <PageOverlay icon={<Lock className="w-6 h-6" />} title="Akses dibatasi" subtitle="403 — Your current role cannot open this page" onBack={closePage}>
      <div className={cardClass}>
        <p className="text-sm text-slate-300">
          <span className="font-bold text-white">{route.title}</span> hanya tersedia untuk peran:{' '}
          <span className="font-mono text-amber-300">{allowedRolesFor(route).join(', ')}</span>.
        </p>
        <p className="text-xs text-slate-400">
          Akun aktif: {currentAccount.name} — <span className="font-mono">{currentAccount.role}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={buildPath(homeRouteFor(currentAccount))} className={primaryLink}>
            Ke beranda saya
          </Link>
          <Link to={loginPathFor(location.path)} className={secondaryLink}>
            Ganti akun
          </Link>
        </div>
      </div>
    </PageOverlay>
  );
};

/**
 * A workspace view that only exists in the modern app shell, opened with a
 * classic-portal account (the classic portal never had this view).
 */
export const ModernAppOnlyPage: React.FC<{ route: RouteDefinition }> = ({ route }) => {
  const { closePage } = usePageContext();
  const { location } = useRouter();

  return (
    <PageOverlay
      icon={<MonitorSmartphone className="w-6 h-6" />}
      title={route.title}
      subtitle="Tersedia di akun Modern App"
      backLabel="Kembali ke Peta"
      onBack={closePage}
    >
      <div className={cardClass}>
        <p className="text-sm text-slate-300">
          Tampilan ini merupakan bagian dari antarmuka Modern App dan tidak tersedia di Portal Klasik. Masuk dengan akun
          Modern App untuk peran yang sama guna membukanya.
        </p>
        <Link to={loginPathFor(location.path)} className={primaryLink}>
          Ganti ke akun Modern App
        </Link>
      </div>
    </PageOverlay>
  );
};
