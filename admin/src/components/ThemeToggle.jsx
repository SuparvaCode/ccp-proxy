import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, toggle }) {
  return (
    <button className="theme-toggle" onClick={toggle} title="Toggle theme">
      {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
