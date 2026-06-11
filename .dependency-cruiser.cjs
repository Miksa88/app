// FAZA 2.4 (PLAN_RADA_WHITELABEL.md) — arhitekturna pravila.
// Čuva čistoću slojeva zauvek: biznis logika (utils) i data-access (services)
// ne smeju da zavise od UI sloja (pages/components) ni od React infrastrukture.
module.exports = {
  forbidden: [
    {
      name: "utils-ne-zavisi-od-ui",
      severity: "error",
      comment:
        "src/utils je čista biznis logika — ne sme da importuje pages/components/hooks/contexts.",
      from: { path: "^src/utils" },
      to: { path: "^src/(pages|components|hooks|contexts)" },
    },
    {
      name: "services-ne-zavise-od-ui",
      severity: "error",
      comment:
        "src/services je data-access sloj — ne sme da importuje pages/components/hooks.",
      from: { path: "^src/services" },
      to: { path: "^src/(pages|components|hooks)" },
    },
    {
      name: "constants-ne-zavise-ni-od-cega",
      severity: "error",
      comment: "src/constants su čiste vrednosti — bez importa iz app slojeva.",
      from: { path: "^src/constants" },
      to: { path: "^src/(pages|components|hooks|contexts|services|utils)" },
    },
    {
      name: "nema-cirkularnih",
      severity: "error",
      comment: "Cirkularne zavisnosti su zabranjene.",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.app.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
