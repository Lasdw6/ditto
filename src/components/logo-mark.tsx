import Image from "next/image";

type LogoMarkProps = {
  compact?: boolean;
};

export function LogoMark({ compact = false }: LogoMarkProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <Image
          src="/brand-extracted/logo-icon-transparent.png"
          alt="Your Chemical Romance icon"
          width={56}
          height={64}
          className="h-14 w-auto shrink-0"
          priority
        />
        <Image
          src="/brand-extracted/logo-wordmark-tight-transparent.png"
          alt="Your Chemical Romance"
          width={340}
          height={260}
          className="h-12 w-auto sm:h-14"
          priority
        />
      </div>
    );
  }

  return (
    <Image
      src="/brand-extracted/logo-primary-transparent.png"
      alt="Your Chemical Romance"
      width={560}
      height={274}
      className="h-28 w-auto sm:h-32"
      priority
    />
  );
}
