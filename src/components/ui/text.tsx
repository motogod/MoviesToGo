import { cn } from '@/lib/utils';
import { useResponsiveScreen } from '@/hooks/index';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  type Role,
  type TextStyle,
} from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground text-base',
    Platform.select({
      web: 'select-text',
    }),
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' }),
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' }),
        ),
        h3: cn(
          'text-2xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20' }),
        ),
        h4: cn(
          'text-xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20' }),
        ),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        ),
        lead: 'text-muted-foreground text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-muted-foreground text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

const VARIANT_FONT_SIZE: Record<TextVariant, number> = {
  default: 16,
  h1: 36,
  h2: 30,
  h3: 24,
  h4: 20,
  p: 16,
  blockquote: 16,
  code: 14,
  lead: 20,
  large: 18,
  small: 14,
  muted: 14,
};

function Text({
  className,
  asChild = false,
  variant = 'default',
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const { getResponsiveFontSize } = useResponsiveScreen();
  const Component = asChild ? Slot : RNText;
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const regularFontSize =
    typeof flattenedStyle?.fontSize === 'number'
      ? flattenedStyle.fontSize
      : VARIANT_FONT_SIZE[variant ?? 'default'];
  const responsiveStyle: TextStyle = {
    fontSize: getResponsiveFontSize(regularFontSize),
  };

  if (typeof flattenedStyle?.lineHeight === 'number') {
    responsiveStyle.lineHeight = getResponsiveFontSize(flattenedStyle.lineHeight);
  }

  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      allowFontScaling={false}
      style={[style, responsiveStyle]}
      {...props}
    />
  );
}

export { Text, TextClassContext };
