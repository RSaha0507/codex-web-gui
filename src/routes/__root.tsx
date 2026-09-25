import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import appCss from '../styles.css?url'
import { APP_NAME, THEME_STORAGE_KEY } from '#/lib/constants'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('${THEME_STORAGE_KEY}');var mode=(stored==='light'||stored==='dark')?stored:'dark';var root=document.documentElement;root.dataset.theme=mode;root.style.colorScheme=mode;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: APP_NAME,
      },
      {
        name: 'description',
        content:
          'A web interface for managing Codex sessions, terminal outputs, and file diffs.',
      },
      {
        property: 'og:title',
        content: APP_NAME,
      },
      {
        property: 'og:description',
        content:
          'A web interface for managing Codex sessions, terminal outputs, and file diffs.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: AppShell,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const sessionsActive = pathname === '/' || pathname.startsWith('/session/')

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-5 pt-4 sm:px-6">
      <header className="sticky top-4 z-40 rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.86)] px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Local Codex Control Room
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-100">
              {APP_NAME}
            </h1>
          </div>
          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5">
            <Link
              to="/"
              className={`rounded-full px-4 py-2 text-sm no-underline transition ${
                sessionsActive
                  ? 'bg-cyan-400/15 text-cyan-100'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              }`}
            >
              Sessions
            </Link>
            <Link
              to="/settings"
              className={`rounded-full px-4 py-2 text-sm no-underline transition ${
                pathname === '/settings'
                  ? 'bg-cyan-400/15 text-cyan-100'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <div className="mt-5 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
