import React, { useRef } from 'react';
import { LoginModal } from '../../features/authentication/LoginModal';
import { usePageContext } from '../../app/pageContext';
import { useRouter } from '../../app/router';
import { sanitizeNextPath } from '../../app/guards/routeAccess';

/**
 * Route: /login/ — the demo account switcher (public).
 *
 * This is NOT real authentication: accounts come from the bundled demo list and no
 * credential is checked. `?next=<path>` is honoured after a successful switch when the
 * chosen account is allowed to open that path.
 */
export const LoginPage: React.FC = () => {
  const { currentAccount, closePage, loginAs } = usePageContext();
  const { query } = useRouter();
  const loggedIn = useRef(false);

  return (
    <LoginModal
      isOpen
      currentAccount={currentAccount}
      onLogin={(account) => {
        loggedIn.current = true;
        loginAs(account, sanitizeNextPath(query.get('next')));
      }}
      onClose={() => {
        // LoginModal calls onClose right after onLogin; the post-login navigation already happened.
        if (!loggedIn.current) closePage();
      }}
    />
  );
};
