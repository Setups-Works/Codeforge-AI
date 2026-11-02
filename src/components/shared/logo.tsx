import Link from "next/link";
import { Flame } from "@/components/icons";
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
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#006bff] text-white">
          <Flame className="size-4" />
        </span>
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
