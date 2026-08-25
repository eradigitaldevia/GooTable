import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import type { RedeSocial } from "@/lib/social-links";
import { cn } from "@/lib/utils";

function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
    >
      <path d="M16.5 3c.3 2 1.5 3.4 3.5 3.7v2.5c-1.3.1-2.6-.3-3.7-1v5.9c0 3.4-2.6 5.9-6 5.9S4.3 17.5 4.3 14.1c0-3.1 2.3-5.6 5.4-5.8v2.6c-1.6.2-2.8 1.5-2.8 3.2 0 1.9 1.4 3.3 3.3 3.3s3.3-1.4 3.3-3.4V3h3z" />
    </svg>
  );
}

export function SocialIcon({
  rede,
  className,
}: {
  rede: RedeSocial;
  className?: string;
}) {
  const cls = cn("h-4 w-4", className);
  switch (rede) {
    case "instagram":
      return <Instagram className={cls} />;
    case "facebook":
      return <Facebook className={cls} />;
    case "youtube":
      return <Youtube className={cls} />;
    case "linkedin":
      return <Linkedin className={cls} />;
    case "x":
      return <Twitter className={cls} />;
    case "tiktok":
      return <TiktokIcon className={cls} />;
  }
}
