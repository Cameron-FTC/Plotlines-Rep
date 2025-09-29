# Allied Health Social Story Tool - Design Guidelines

## Design Approach: Healthcare Design System
**Approach:** Custom healthcare-focused design system drawing from accessibility-first principles and therapeutic interface patterns. This tool requires a calm, professional aesthetic that builds trust with healthcare professionals while remaining approachable for neurodiverse clients.

**Key Principles:**
- Neuro-affirming design with reduced cognitive load
- Clear visual hierarchy for form completion
- Calming, therapeutic color palette
- High accessibility standards

## Core Design Elements

### A. Color Palette
**Primary Colors (Light Mode):**
- Primary: 200 40% 45% (Calming teal-blue)
- Secondary: 220 30% 25% (Deep navy for text)
- Background: 0 0% 98% (Soft white)

**Primary Colors (Dark Mode):**
- Primary: 200 35% 65% (Lighter teal)
- Secondary: 220 15% 85% (Light text)
- Background: 220 20% 12% (Dark blue-gray)

**Accent Colors:**
- Success: 140 45% 55% (Gentle green)
- Warning: 35 70% 60% (Warm orange)
- Neutral: 210 10% 70% (Soft gray)

### B. Typography
**Font Stack:** Inter (via Google Fonts CDN)
- Headings: Inter 600 (Semi-bold)
- Body: Inter 400 (Regular)
- Form labels: Inter 500 (Medium)
- Story text: Inter 400 with increased line-height (1.7)

### C. Layout System
**Spacing Units:** Tailwind units of 3, 4, 6, 8, 12, 16
- Standard padding: p-6
- Section spacing: mb-8
- Form element spacing: gap-4
- Container max-width: max-w-4xl

### D. Component Library

**Navigation:**
- Simple header with tool title and optional user info
- Minimal, clean design with subtle shadows

**Forms:**
- Large, well-spaced dropdown selects with clear labels
- Multi-step form progression with clear indicators
- Generous touch targets (min 44px height)
- Soft rounded corners (rounded-lg)

**Story Display:**
- Clean, readable story container with subtle background
- Print-friendly formatting with page break considerations
- Clear typography hierarchy for story sections

**Buttons:**
- Primary: Filled with primary color
- Secondary: Outline style with primary border
- Generous padding (px-6 py-3)
- Rounded corners (rounded-md)

**Data Displays:**
- Card-based layout for story previews
- Clean borders and subtle shadows
- Adequate white space between elements

### E. Specific Interface Sections

**Story Generation Form:**
- Progressive disclosure - show relevant options based on previous selections
- Clear section headers with icons from Heroicons
- Helpful tooltips for complex therapeutic terms
- Visual feedback during story generation

**Story Preview Area:**
- Clean, book-like presentation
- Easy-to-read typography with ample line spacing
- Print button with professional styling
- Edit functionality with inline editing capabilities

**Professional Features:**
- Client information management (optional)
- Story templates and favorites
- Export options (PDF, print)

## Images
**Hero Section:** No large hero image - focus on immediate tool access
**Supporting Images:** Small therapeutic icons throughout the interface (calming illustrations of activities, characters)
**Story Illustrations:** Placeholder areas for optional simple illustrations within generated stories

## Accessibility & Therapeutic Considerations
- High contrast ratios (WCAG AA compliant)
- Large click targets and form elements
- Clear focus indicators
- Reduced motion by default
- Screen reader friendly structure
- Consistent navigation patterns to reduce cognitive load

This design creates a professional, calming environment that healthcare professionals can confidently use while ensuring the interface remains accessible and non-overwhelming for neurodiverse clients who may view the generated stories.