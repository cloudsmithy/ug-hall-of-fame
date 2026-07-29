/**
 * 页脚
 */
import type { SiteConfig } from "../content/types";
import { safeUrl } from "../lib/utils";
import "./Footer.css";

export function Footer({ site }: { site: SiteConfig }) {
  const links = site.footer.links
    .map((l) => ({ ...l, href: safeUrl(l.url) }))
    .filter((l): l is typeof l & { href: string } => l.href !== null);

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        {site.footer.text && <p className="footer-text">{site.footer.text}</p>}
        {links.length > 0 && (
          <nav className="footer-links" aria-label="相关链接">
            {links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
