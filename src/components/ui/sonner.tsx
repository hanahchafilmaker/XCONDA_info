// Adapted from shadcn/ui (MIT). See LICENSE.shadcn.md.
import { Toaster as Sonner } from "sonner";
import { useLang } from "../../i18n";

export function Toaster() {
  const { t } = useLang();
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      offset={24}
      mobileOffset={16}
      containerAriaLabel={t("common.notifications")}
      toastOptions={{ className: "font-sans", duration: 4000 }}
    />
  );
}
