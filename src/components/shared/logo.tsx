import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={APP_NAME}
      className={cn("inline-flex items-center", className)}
    >
      {compact ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo-mark.png" alt={APP_NAME} width={28} height={28} className="size-7 rounded-lg" />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={APP_NAME}
            width={956}
            height={223}
            className="h-7 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-dark.png"
            alt={APP_NAME}
            width={956}
            height={223}
            className="hidden h-7 w-auto dark:inline-block"
          />
        </>
      )}
    </Link>
  );
}
