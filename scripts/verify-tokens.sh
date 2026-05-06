#!/usr/bin/env bash
# ============================================================================
# verify-tokens.sh — WS-1 dev-tooling gate
# Spec: design-system/MASTER.md §1
# ============================================================================
#
# Sprečava regresiju design system tokena. Fail-fast sa jasnim error-om.
# Pokreće ga: `npm run verify:tokens` + CI + (opciono) pre-commit hook.
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0

# Whitelist — ovi fajlovi SMEJU imati hex (brand logo assets, shadcn primitives)
WHITELIST_PATTERN='src/components/ui/chart\.tsx|src/components/ui/sidebar\.tsx|src/pages/Login\.tsx|src/components/onboarding/SignUpSheet\.tsx|src/pages/trainer/TrainerProfile\.tsx'

echo "🔍 Checking design system token compliance..."
echo ""

# 1. Hex boje u .tsx (sem whitelist-a)
echo "→ Checking for hardcoded hex colors..."
HEX_HITS=$(grep -rn '#[0-9A-Fa-f]\{6\}' src/ --include='*.tsx' 2>/dev/null \
  | grep -Ev "$WHITELIST_PATTERN" || true)

if [ -n "$HEX_HITS" ]; then
  echo -e "${RED}✗ Hardcoded hex colors found:${NC}"
  echo "$HEX_HITS"
  echo -e "${YELLOW}  Fix: zameni sa 'hsl(var(--primary))' ili semantic Tailwind klasom${NC}"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No hardcoded hex colors${NC}"
fi

# 2. Arbitrary shadows u .tsx (sem shadcn)
echo "→ Checking for arbitrary shadows..."
SHADOW_HITS=$(grep -rn 'shadow-\[' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' \
  | grep -v 'hsl(var(' || true)

if [ -n "$SHADOW_HITS" ]; then
  echo -e "${RED}✗ Arbitrary shadows found (koristi card-shadow ili shadow-elevated):${NC}"
  echo "$SHADOW_HITS"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No arbitrary shadows outside shadcn/ui${NC}"
fi

# 3. Lokalne fadeUp definicije (koristi import iz @/lib/motion)
echo "→ Checking for local fadeUp duplicates..."
FADEUP_HITS=$(grep -rn 'const fadeUp' src/ --include='*.tsx' --include='*.ts' 2>/dev/null \
  | grep -v 'src/lib/motion\.ts' \
  | grep -v 'src/pages/Login\.tsx' || true)

if [ -n "$FADEUP_HITS" ]; then
  echo -e "${RED}✗ Local fadeUp definitions found:${NC}"
  echo "$FADEUP_HITS"
  echo -e "${YELLOW}  Fix: uvezi iz '@/lib/motion' umesto lokalnog definisanja${NC}"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ fadeUp is imported from @/lib/motion only${NC}"
fi

# 4. px u tsx za font-size (koristi rem utility tipografiju)
echo "→ Checking for hardcoded font-size in px (use .text-* utilities)..."
FONTSIZE_HITS=$(grep -rn 'fontSize:.*px\|font-\[.*px' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

# Non-fatal — warning only (postoje legitimni slučajevi inline SVG)
if [ -n "$FONTSIZE_HITS" ]; then
  echo -e "${YELLOW}⚠ Hardcoded font-size u px (konsideruj .text-* utility):${NC}"
  echo "$FONTSIZE_HITS" | head -5
  echo "..."
fi

# 5. text-[Npx] arbitrary (koristi iOS text-* klase)
echo "→ Checking for text-[Npx] arbitrary font sizes..."
TEXT_ARB_WHITELIST='src/components/ui/|src/components/PageHeader\.tsx|src/pages/trainer/PackageEditor\.tsx|src/components/onboarding/WelcomeScreen\.tsx|src/components/onboarding/ProcessingScreen\.tsx|src/components/onboarding/FrequencyStep\.tsx|src/pages/trainer/TrainerDashboard\.tsx|text-\[hsl\('
TEXT_ARB_HITS=$(grep -rn 'text-\[[0-9]\+px\]' src/ --include='*.tsx' 2>/dev/null \
  | grep -Ev "$TEXT_ARB_WHITELIST" || true)

if [ -n "$TEXT_ARB_HITS" ]; then
  echo -e "${YELLOW}⚠ Arbitrary text-[Npx] found (koristi .text-caption-1/footnote/subhead/body/headline/title-1-3/large-title):${NC}"
  echo "$TEXT_ARB_HITS" | head -8
  echo "..."
fi

# 6. min-h-[44px] / min-w-[44px] umesto Tailwind default
echo "→ Checking for min-h-[44px] / min-w-[44px] (use min-h-11 / min-w-11)..."
TOUCH_HITS=$(grep -rn 'min-h-\[44px\]\|min-w-\[44px\]' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

if [ -n "$TOUCH_HITS" ]; then
  echo -e "${YELLOW}⚠ min-h-[44px]/min-w-[44px] found (koristi min-h-11/min-w-11):${NC}"
  echo "$TOUCH_HITS" | head -5
fi

# 7. rounded-[Npx] arbitrary (koristi rounded-lg/xl/2xl/3xl/full)
echo "→ Checking for rounded-[Npx] arbitrary radii..."
ROUNDED_HITS=$(grep -rn 'rounded-\[[0-9]\+px\]' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

if [ -n "$ROUNDED_HITS" ]; then
  echo -e "${YELLOW}⚠ Arbitrary rounded-[Npx] found (koristi rounded-xl/2xl/3xl/full):${NC}"
  echo "$ROUNDED_HITS" | head -5
fi

# 8. Inline hsl()/rgb()/rgba() u style= atributima (WS-8 G4)
#    Bypassuju tokene; koristi Tailwind klase sa hsl(var(--token)).
echo "→ Checking for inline hsl()/rgba() in style attributes..."
INLINE_HSL_HITS=$(grep -rn "style=\{\{[^}]*\(hsl\|rgba\?\)(" src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' \
  | grep -v 'hsl(var(' || true)

if [ -n "$INLINE_HSL_HITS" ]; then
  echo -e "${RED}✗ Inline hsl()/rgba() in style= found (use Tailwind class sa hsl(var(--token))):${NC}"
  echo "$INLINE_HSL_HITS"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No inline color literals in style attributes${NC}"
fi

# 9. Arbitrary spacing (p-/m-/gap-/inset-[Npx]) — koristi Tailwind skalu ili tokene (WS-8)
echo "→ Checking for arbitrary px spacing (p/m/gap/inset-[Npx])..."
SPACING_HITS=$(grep -rnE '(\b|"|`| )(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|inset|top|bottom|left|right|w|h|max-w|max-h|min-w|min-h)-\[[0-9]+px\]' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

if [ -n "$SPACING_HITS" ]; then
  echo -e "${YELLOW}⚠ Arbitrary px spacing found (koristi Tailwind 4/8dp skalu: p-1..p-12, gap-x, itd.):${NC}"
  echo "$SPACING_HITS" | head -10
  echo "..."
fi

# 10. Hardcoded z-index u JSX (koristi z-sticky/dropdown/sheet/modal/toast Tailwind alijase)
echo "→ Checking for hardcoded z-index (z-[N] ili zIndex: N)..."
ZINDEX_HITS=$(grep -rnE '(\bz-\[[0-9]+\]|zIndex:\s*[0-9]+)' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

if [ -n "$ZINDEX_HITS" ]; then
  echo -e "${YELLOW}⚠ Hardcoded z-index found (koristi z-sticky/z-dropdown/z-sheet/z-modal/z-toast alijase):${NC}"
  echo "$ZINDEX_HITS" | head -10
  echo "..."
fi

# 11. Font-family u JSX style=/className (samo system stack + brand font iz tokena)
echo "→ Checking for hardcoded font-family strings..."
FONT_FAMILY_HITS=$(grep -rnE 'fontFamily:\s*["'\''][^"'\'']+["'\'']|font-\[\s*['\''"][^'\''"]+['\''"]' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

if [ -n "$FONT_FAMILY_HITS" ]; then
  echo -e "${RED}✗ Hardcoded font-family found (sve font decisions ide kroz tailwind theme / index.css):${NC}"
  echo "$FONT_FAMILY_HITS"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✓ No hardcoded font-family strings${NC}"
fi

# 12. Animation duration u JSX (koristi MOTION_DURATION tokens iz @/lib/motion)
echo "→ Checking for hardcoded animation duration (transition:.*ms|duration-[0-9]+ms)..."
ANIM_DURATION_HITS=$(grep -rnE '(transitionDuration:\s*["'\''][0-9]+m?s|duration-\[[0-9]+m?s\]|transition:\s*["'\''][^"'\'']*[0-9]+m?s)' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' \
  | grep -v 'src/lib/motion\.ts' || true)

if [ -n "$ANIM_DURATION_HITS" ]; then
  echo -e "${YELLOW}⚠ Hardcoded animation duration found (koristi MOTION_DURATION.fast/base/slow iz @/lib/motion):${NC}"
  echo "$ANIM_DURATION_HITS" | head -8
  echo "..."
fi

# 13. Inline background-color/color u JSX style= osim hsl(var(--...))
echo "→ Checking for inline background/color outside tokens..."
INLINE_BG_HITS=$(grep -rnE 'style=\{\{[^}]*(backgroundColor|color):\s*["'\''](?!hsl\(var)' src/ --include='*.tsx' 2>/dev/null \
  | grep -v 'src/components/ui/' || true)

# (Non-fatal — moguće su dev-only overrides ili user-avatar color literal za palete)
if [ -n "$INLINE_BG_HITS" ]; then
  echo -e "${YELLOW}⚠ Inline color/backgroundColor van tokena:${NC}"
  echo "$INLINE_BG_HITS" | head -5
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✗ $ERRORS design token violations${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All design tokens compliant${NC}"
