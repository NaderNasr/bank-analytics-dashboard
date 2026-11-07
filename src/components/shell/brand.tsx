import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function Brand() {
  const t = useTranslations("Brand");
  return (
    <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-on-nav">
      <ShieldCheck aria-hidden className="size-5 text-gold-accent" />
      {t("name")}
    </span>
  );
}
