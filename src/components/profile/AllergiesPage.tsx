import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

// Alergije — sub-page izdvojen iz Profile.tsx (verbatim JSX, state ostaje u Profile)
interface AllergiesPageProps {
  allergies: string[];
  allAllergies: string[];
  toggleAllergy: (a: string) => void;
}

const AllergiesPage = ({ allergies, allAllergies, toggleAllergy }: AllergiesPageProps) => {
  const { t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("allergies.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("allergies.subtitle")}</p>
      <div className="flex flex-wrap gap-2">
        {allAllergies.map((a) => {
          const selected = allergies.includes(a);
          return (
            <button key={a} onClick={() => toggleAllergy(a)}
              className={`px-4 py-3 rounded-full min-h-11 transition-colors text-body ${selected ? "gradient-primary text-primary-foreground font-semibold" : "bg-card card-shadow text-foreground"}`}>
              {a}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AllergiesPage;
