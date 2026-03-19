import Link from 'next/link'

type Crumb = {
  label: string
  href?: string
}

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)] font-[family-name:var(--font-body)] mb-4">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-[var(--ocean)] underline underline-offset-2">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[var(--ink)] font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
