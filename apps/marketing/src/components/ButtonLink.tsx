import Link from 'next/link';
import type { ReactNode, MouseEventHandler } from 'react';

type Props = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function ButtonLink({ href, children, variant = 'primary', onClick }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2';
  const primary =
    'bg-black text-white hover:bg-neutral-800 focus:ring-neutral-900';
  const secondary =
    'bg-white text-black ring-1 ring-neutral-200 hover:bg-neutral-50 focus:ring-neutral-300';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${base} ${variant === 'primary' ? primary : secondary}`}
    >
      {children}
    </Link>
  );
}
