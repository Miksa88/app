// ============================================================================
// MealSearchModal — component testovi
// ============================================================================
//
// Pokriva: render liste, search filtriranje (kontrolisani prop), onSelect
// callback, "Slično ovome" auto-suggest (realni findSimilarMeals nad
// fixture pool-om), "Ne volim ovo" red i limit od 8 rezultata.
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

import MealSearchModal, { type MealSearchModalProps } from "./MealSearchModal";
import type { FoodItem } from "@/data/foodDatabase";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

function makeFood(overrides: Partial<FoodItem> & { id: string }): FoodItem {
  return {
    name: overrides.id,
    nameEn: overrides.id,
    nameSr: overrides.id,
    description: "",
    calories: 300,
    protein: 30,
    carbs: 20,
    fat: 10,
    fiber: 3,
    sugar: 2,
    sodium: 100,
    portionSize: "1 porcija",
    mealSlots: ["lunch"],
    ingredients: [],
    preparation: [],
    allergens: [],
    tags: [],
    glycemicIndex: "low",
    prepTime: "10 min",
    imageUrl: null,
    ...overrides,
  };
}

// Pool: dva makro-slična lunch jela + jedno potpuno različito (breakfast)
const FOODS: FoodItem[] = [
  makeFood({ id: "piletina", name: "Piletina sa pirinčem", calories: 305, protein: 29 }),
  makeFood({ id: "tuna", name: "Tuna salata", calories: 295, protein: 31 }),
  makeFood({ id: "ovsena", name: "Ovsena kaša", calories: 600, protein: 10, mealSlots: ["breakfast"] }),
];

function renderModal(overrides: Partial<MealSearchModalProps> = {}) {
  const onSelect = vi.fn();
  const onSearchChange = vi.fn();
  const onOpenChange = vi.fn();

  const props: MealSearchModalProps = {
    open: true,
    onOpenChange,
    title: "Izaberi alternativu",
    currentMeal: null,
    foods: FOODS,
    onSelect,
    search: "",
    onSearchChange,
    searchPlaceholder: "Pretraži hranu...",
    confirmLabel: "Zameni",
    ...overrides,
  };

  const view = render(<MealSearchModal {...props} />);
  return { ...view, props, onSelect, onSearchChange, onOpenChange };
}

describe("MealSearchModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderuje naslov i kompletnu listu hrane kad je search prazan", () => {
    renderModal();

    expect(screen.getByText("Izaberi alternativu")).toBeInTheDocument();
    expect(screen.getByText("Piletina sa pirinčem")).toBeInTheDocument();
    expect(screen.getByText("Tuna salata")).toBeInTheDocument();
    expect(screen.getByText("Ovsena kaša")).toBeInTheDocument();
  });

  it("kucanje u search input zove onSearchChange (kontrolisani state)", () => {
    const { onSearchChange } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("Pretraži hranu..."), {
      target: { value: "tuna" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("tuna");
  });

  it("search prop filtrira listu (case-insensitive)", () => {
    renderModal({ search: "TUNA" });

    expect(screen.getByText("Tuna salata")).toBeInTheDocument();
    expect(screen.queryByText("Piletina sa pirinčem")).not.toBeInTheDocument();
    expect(screen.queryByText("Ovsena kaša")).not.toBeInTheDocument();
  });

  it("klik na hranu iz liste zove onSelect sa tim FoodItem-om", () => {
    const { onSelect } = renderModal({ search: "tuna" });

    fireEvent.click(screen.getByText("Tuna salata"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "tuna" });
  });

  it("currentMeal aktivira 'Slično ovome' suggest sa makro-sličnim jelima istog slota", () => {
    renderModal({
      currentMeal: { mealId: "nesto-trece", calories: 300, protein: 30, slot: "lunch" },
    });

    expect(screen.getByText("Slično ovome")).toBeInTheDocument();
    // Oba lunch jela su ±10% po kalorijama i proteinu → u suggest + u listi
    expect(screen.getAllByText("Piletina sa pirinčem")).toHaveLength(2);
    expect(screen.getAllByText("Tuna salata")).toHaveLength(2);
    // Breakfast jelo van slota — samo u glavnoj listi, ne u suggest-u
    expect(screen.getAllByText("Ovsena kaša")).toHaveLength(1);
  });

  it("'Slično ovome' nestaje čim korisnica kuca u search", () => {
    renderModal({
      currentMeal: { mealId: "nesto-trece", calories: 300, protein: 30, slot: "lunch" },
      search: "pil",
    });

    expect(screen.queryByText("Slično ovome")).not.toBeInTheDocument();
  });

  it("bez currentMeal nema 'Slično ovome' sekcije", () => {
    renderModal({ currentMeal: null });
    expect(screen.queryByText("Slično ovome")).not.toBeInTheDocument();
  });

  it("klik na suggest jelo zove onSelect", () => {
    const { onSelect } = renderModal({
      currentMeal: { mealId: "nesto-trece", calories: 300, protein: 30, slot: "lunch" },
    });

    // Prvi match je suggest red (suggest sekcija je iznad liste)
    fireEvent.click(screen.getAllByText("Tuna salata")[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "tuna" });
  });

  it("dislike red: prikazuje label + ime hrane, klik zove onDislike", () => {
    const onDislike = vi.fn();
    renderModal({
      dislike: { label: "Ne volim ovo", foodName: "Tuna salata", onDislike },
    });

    fireEvent.click(screen.getByText("Ne volim ovo"));
    expect(onDislike).toHaveBeenCalledTimes(1);
  });

  it("bez dislike prop-a nema 'Ne volim ovo' reda", () => {
    renderModal({ dislike: null });
    expect(screen.queryByText("Ne volim ovo")).not.toBeInTheDocument();
  });

  it("lista je ograničena na max 8 rezultata", () => {
    const manyFoods = Array.from({ length: 12 }, (_, i) =>
      makeFood({ id: `jelo-${i}`, name: `Jelo ${i}` }),
    );
    renderModal({ foods: manyFoods });

    expect(screen.getAllByText(/^Jelo \d+$/)).toHaveLength(8);
  });

  it("getFoodName prop kontroliše prikaz imena (sr lokalizacija)", () => {
    renderModal({
      getFoodName: (f) => f.nameSr.toUpperCase(),
      foods: [makeFood({ id: "x", nameSr: "pastrmka" })],
    });

    expect(screen.getByText("PASTRMKA")).toBeInTheDocument();
  });
});
