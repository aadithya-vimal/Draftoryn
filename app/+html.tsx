import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every web page.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Draftoryn</title>
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          :root, [data-theme="dark"] {
            --color-bg: #090A0C;
            --color-bg-alt: #101216;
            --color-surface: #101216;
            --color-surface2: #15181D;
            --color-surface-hover: #191C22;
            --color-border: #272B32;
            --color-border-light: #343941;
            --color-border-active: #2F6BFF;
            --color-text: #F5F3EE;
            --color-text-secondary: #A1A5AD;
            --color-muted: #727780;
            --color-muted-light: #A1A5AD;
            --color-text-dim: #525760;
            --color-accent: #2F6BFF;
            --color-accent-hover: #1F4FD1;
            --color-accent-subtle: rgba(47, 107, 255, 0.12);
            --color-accent-secondary: #343941;
            --color-accent-foreground: #FFFFFF;
            --color-danger: #D94A4A;
            --color-danger-bg: rgba(217, 74, 74, 0.12);
            --color-warn: #D99A24;
            --color-warn-bg: rgba(217, 154, 36, 0.12);
            --color-ok: #31B77A;
            --color-ok-bg: rgba(49, 183, 122, 0.12);
            --color-info: #2F6BFF;
            --color-info-bg: rgba(47, 107, 255, 0.12);
          }
          [data-theme="light"] {
            --color-bg: #F6F7F9;
            --color-bg-alt: #FFFFFF;
            --color-surface: #FFFFFF;
            --color-surface2: #F0F2F5;
            --color-surface-hover: #E8EBEF;
            --color-border: #D6D9E0;
            --color-border-light: #E2E5EB;
            --color-border-active: #1F5EFF;
            --color-text: #0D0F12;
            --color-text-secondary: #474C56;
            --color-muted: #686E7B;
            --color-muted-light: #8C93A1;
            --color-text-dim: #A6ACB8;
            --color-accent: #1F5EFF;
            --color-accent-hover: #0F4BD9;
            --color-accent-subtle: rgba(31, 94, 255, 0.09);
            --color-accent-secondary: #E2E5EB;
            --color-accent-foreground: #FFFFFF;
            --color-danger: #DC2626;
            --color-danger-bg: rgba(220, 38, 38, 0.08);
            --color-warn: #B45309;
            --color-warn-bg: rgba(180, 83, 9, 0.08);
            --color-ok: #15803D;
            --color-ok-bg: rgba(21, 128, 61, 0.08);
            --color-info: #1F5EFF;
            --color-info-bg: rgba(31, 94, 255, 0.08);
          }
          body {
            background-color: var(--color-bg, #090A0C);
            color: var(--color-text, #F5F3EE);
          }
          /* ---- Draftoryn restrained document-motion system (web only) ---- */
          .dryn-gradient {
            background: linear-gradient(92deg, #2F6BFF 5%, #7AA8FF 38%, #B9CDFF 50%, #7AA8FF 62%, #2F6BFF 95%);
            background-size: 220% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
            animation: dryn-gradient-pan 9s ease-in-out infinite;
          }
          @keyframes dryn-gradient-pan {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .dryn-reveal {
            opacity: 0;
            transform: translateY(14px);
            transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1);
          }
          .dryn-reveal.dryn-visible {
            opacity: 1;
            transform: none;
          }
          .dryn-caret {
            display: inline-block;
            width: 2px;
            align-self: stretch;
            background: var(--color-accent, #2F6BFF);
            animation: dryn-caret-blink 1.1s steps(2, start) infinite;
          }
          @keyframes dryn-caret-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .dryn-flow-dash {
            stroke-dasharray: 5 6;
            animation: dryn-dash-drift 2.6s linear infinite;
          }
          @keyframes dryn-dash-drift {
            to { stroke-dashoffset: -22; }
          }
          .dryn-flow-line {
            height: 2px;
            flex: 1;
            min-width: 24px;
            background-image: linear-gradient(90deg, var(--color-accent, #2F6BFF) 55%, transparent 45%);
            background-size: 11px 2px;
            background-repeat: repeat-x;
            opacity: 0.7;
            animation: dryn-flow-slide 1.1s linear infinite;
          }
          @keyframes dryn-flow-slide {
            to { background-position: 11px 0; }
          }
          .dryn-typing-line {
            transform-origin: left center;
            animation: dryn-line-in 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) both;
          }
          @keyframes dryn-line-in {
            from { opacity: 0; transform: scaleX(0.6); }
            to { opacity: 1; transform: scaleX(1); }
          }
          .dryn-pulse-dot {
            animation: dryn-pulse 2.2s ease-in-out infinite;
          }
          @keyframes dryn-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.35; }
          }
          .dryn-page-float {
            animation: dryn-page-float 7s ease-in-out infinite;
          }
          @keyframes dryn-page-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-7px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .dryn-gradient,
            .dryn-caret,
            .dryn-flow-dash,
            .dryn-flow-line,
            .dryn-typing-line,
            .dryn-pulse-dot,
            .dryn-page-float {
              animation: none !important;
            }
            .dryn-reveal {
              opacity: 1;
              transform: none;
              transition: none;
            }
            .dryn-typing-line {
              opacity: 1;
            }
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var theme = localStorage.getItem('draftoryn_theme_mode') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
          } catch (e) {}
        `}} />
      </head>
      <body style={{ backgroundColor: "var(--color-bg, #090A0C)", margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
