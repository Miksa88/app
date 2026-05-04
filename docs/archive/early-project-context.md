## **1\. Project Context**

* **Mission:** A biological engineering fitness platform for women, focusing on hypertrophy and metabolic health.  
* **Tech Stack:** Vite \+ React \+ TypeScript \+ Tailwind CSS \+ Supabase.  
* **Core Philosophy:** Identity over calories. Biological time over calendar time (Queue system).

## **2\. Core Architecture (The Integration Layer)**

* **Single Source of Truth:** `UserStatus` object in Supabase. It synchronizes Training and Nutrition modules.  
* **Sync Engine:** Every update to the `UserStatus` must trigger `runSyncRules()` to maintain biological consistency (e.g., Deload Sync, Hormonal Sync).  
* **Event-Driven:** Use a Subscriber pattern for communication between modules to avoid direct coupling.

## **3\. Strict Domain Rules**

### **Training (Module 01\)**

* **Workout Queue:** No "missed" workouts. Use a pointer-based queue (A1 \-\> B1 \-\> A2...).  
* **Partition-specific Decay:** Track recovery timers separately for Lower, Upper, and FullBody partitions.  
* **Recovery Multiplier:** Range 0.7 \- 1.1. It dictates the number of sets (MEV/MAV/MRV zones).  
* **Return from Break:** Trigger 2 light sessions (-20% weight, \-50% sets) if a partition hasn't been trained for \>7 days.

### **Nutrition (Module 02\)**

* **Anti-Ingredient Filter:** Hard exclusion for allergies and pathological contraindications (e.g., Gluten for Hashimoto).  
* **Metabolic Matrix:** Specific rules for IR, PCOS, and Hashimoto. IR clients have 5 slots but slots 2 & 4 are "Mini-meals" (P+F only).  
* **MA5 Trendline:** Use 5-day moving average for weight tracking. Ignore weight delta during menstrual days 1-5.  
* **Hormonal Buffer:** Automatically add \+150 kcal during the Luteal phase (days 21-28).

## **4\. UI/UX & Design Standards**

* **Visual Language:** Apple High-End . Use Glassmorphism, heavy blur effects, and fluid gradients.  
* **Atomic Design:** Break components into Atoms, Molecules, and Organisms.  
* **UX Principles:** "Zero-Guilt" UX. No negative framing for skipped tasks. Focus on the "Next step".

## **5\. Development Workflow & Guidelines**

* **TypeScript:** Always define interfaces before implementation. Favor strict types over `any`.  
* **Tailwind:** Use utility-first classes. Follow the established `tailwind.config.js` for colors and spacing.  
* **Logic Preservation:** Never modify core biological logic in `.md` files without explicit confirmation.  
* **Token Efficiency:**  
  * Do not read `node_modules`.  
  * Reference only necessary `.md` masters for the current task.  
  * Always verify `UserStatus` integrity after any state-changing function.

## **6\. Key File Mapping**

* `01_TRAINING_FLOW_MASTER.md`: Training logic and progression.  
* `02_NUTRITION_FLOW_MASTER.md`: Nutrition, BMR, and metabolic rules.  
* `03_INTEGRATION_LAYER.md`: Sync Engine and UserStatus schema.  
* `.claude/skills/ui-ux-pro-max/SKILL.md`: UI design instructions.

