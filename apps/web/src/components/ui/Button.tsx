import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'liberal' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-orange text-white shadow-[0_5px_0_var(--color-orange-shadow)] hover:bg-orange-hover focus-visible:bg-orange-hover',
  liberal:
    'bg-liberal text-white shadow-[0_5px_0_var(--color-liberal-shadow)] hover:bg-liberal-hover focus-visible:bg-liberal-hover',
  ghost: 'bg-transparent text-text-2 underline underline-offset-4 shadow-none hover:text-white',
};

/** The chunky, pressable button of the original game. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sizing =
    size === 'lg'
      ? 'px-8 py-3 text-[28px]'
      : size === 'sm'
        ? 'px-4 py-1.5 text-lg'
        : 'px-6 py-2.5 text-[22px]';
  const pressable =
    variant === 'ghost'
      ? ''
      : 'enabled:active:translate-y-[5px] enabled:active:shadow-none disabled:cursor-not-allowed disabled:bg-disabled disabled:shadow-[0_5px_0_var(--color-disabled-shadow)]';
  return (
    <button
      type={type}
      className={`relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 font-display leading-none tracking-wide transition-[background,transform,box-shadow] duration-150 ${sizing} ${VARIANTS[variant]} ${pressable} ${className}`}
      {...props}
    />
  );
}
