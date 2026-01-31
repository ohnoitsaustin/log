export function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('log-theme');
        var isDark = theme === 'dark' ||
          (!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) document.documentElement.classList.add('dark');
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
