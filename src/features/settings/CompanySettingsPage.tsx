import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/PageHeader";
import { CompanyProfileCard } from "./CompanyProfileCard";
import { CompanyLogoCard } from "./CompanyLogoCard";
import { CompanyRatesCard } from "./CompanyRatesCard";

export function CompanySettingsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
      <div className="grid gap-4">
        <CompanyProfileCard />
        <CompanyLogoCard />
        <CompanyRatesCard />
      </div>
    </>
  );
}
