# Design reference

Source: https://billcreates.tech/
Page: Billcreates.tech - Bill Aung Pyae Soe

Measured from 170 rendered elements at 1512 x 861px. This is a sample of the current document and state, not the original design source.

## Color palette

Only observed CSS colors are listed. Usage labels describe where a color was found. Hex is an sRGB preview; retain the original CSS value for its color space and transparency.

Usage | Original CSS value | sRGB hex | Observed root properties | Occurrences
--- | --- | --- | --- | ---
Text | rgb(161, 161, 161) | #A1A1A1 | --theme-muted | 68
Text | rgb(237, 237, 237) | #EDEDED |  | 31
Text | rgb(0, 0, 0) | #000000 | --theme-page | 2
Surface | rgb(237, 237, 237) | #EDEDED |  | 4
Surface | rgb(0, 0, 0) | #000000 | --theme-page | 3
Surface | rgb(23, 23, 23) | #171717 | --theme-cell | 1
Border | rgb(38, 38, 38) | #262626 |  | 31
Border | rgb(51, 51, 51) | #333333 |  | 10
Border | rgb(237, 237, 237) | #EDEDED |  | 1
Icon | rgb(237, 237, 237) | #EDEDED |  | 5
Icon | rgb(73, 56, 47) | #49382F |  | 3
Icon | rgb(255, 240, 209) | #FFF0D1 |  | 3
Icon | rgb(48, 46, 41) | #302E29 |  | 1
Icon | rgb(230, 163, 96) | #E6A360 |  | 1
Icon | rgb(206, 119, 98) | #CE7762 |  | 1
Icon | rgb(220, 131, 129) | #DC8381 |  | 1

## Typography

Role | Family | Size | Weight | Line height | Tracking | Text transform
--- | --- | --- | --- | --- | --- | ---
Heading | "Bricolage Grotesque", Arial, sans-serif | 110.376px | 700 | 99.3384px | -3.86316px | uppercase
Body | "Bricolage Grotesque", Arial, sans-serif | 16px | 400 | 22.4px | -0.24px | none
Small text | "Bricolage Grotesque", Arial, sans-serif | 12px | 400 | 17.4px | normal | none
Button | "IBM Plex Mono", ui-monospace, monospace | 10px | 400 | 14px | normal | uppercase

## Spacing

Value | Occurrences
--- | ---
6px | 4
7px | 6
12px | 2
16px | 68
33.264px | 2
258.133px | 1

## Layout gaps

Value | Occurrences
--- | ---
6px | 4
8px | 12
12px | 60
14px | 2
16px | 6

## Corner radii

Value | Occurrences
--- | ---
50% | 4

## Shadows

Value | Occurrences
--- | ---
rgb(51, 51, 51) 0px 0px 0px 1px | 1

## Motion durations

Value | Occurrences
--- | ---
0.14s | 55
0.18s | 1

## Motion easing

Value | Occurrences
--- | ---
ease | 56

### Accessible keyframe names

- lucky-intro-sniff
- lucky-blink
- lucky-ear-flick
- lucky-wag
- lucky-paw
- lucky-happy
- lucky-ponder
- lucky-dot
- lucky-breathe

## Component recipes

Computed styles for the captured state. Selectors identify sampled elements; text and placeholders come from the page. Form values are excluded. These style specimens do not reconstruct child markup or uncaptured interaction states.

### Button 1

Observed text or placeholder: INDEX

```css
button.is-active {
  align-items: normal;
  backdrop-filter: none;
  background-color: rgb(237, 237, 237);
  background-image: none;
  border-bottom-color: rgb(0, 0, 0);
  border-bottom-style: none;
  border-bottom-width: 0px;
  border-left-color: rgb(0, 0, 0);
  border-left-style: none;
  border-left-width: 0px;
  border-radius: 0px;
  border-right-color: rgb(0, 0, 0);
  border-right-style: none;
  border-right-width: 0px;
  border-top-color: rgb(0, 0, 0);
  border-top-style: none;
  border-top-width: 0px;
  box-shadow: none;
  color: rgb(0, 0, 0);
  display: block;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 400;
  gap: normal;
  justify-content: normal;
  letter-spacing: normal;
  line-height: 14px;
  opacity: 1;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  padding-top: 0px;
  text-transform: uppercase;
}
```

Ancestor backgrounds (outermost first):

Layer | Background color | Background image | Opacity
--- | --- | --- | ---
1 | rgb(0, 0, 0) | none | 1
2 | rgb(0, 0, 0) | none | 1
3 | rgb(0, 0, 0) | none | 1

### Button 2

Observed text or placeholder: INFO

```css
button {
  align-items: normal;
  backdrop-filter: none;
  background-color: rgba(0, 0, 0, 0);
  background-image: none;
  border-bottom-color: rgb(161, 161, 161);
  border-bottom-style: none;
  border-bottom-width: 0px;
  border-left-color: rgb(51, 51, 51);
  border-left-style: solid;
  border-left-width: 1px;
  border-radius: 0px;
  border-right-color: rgb(161, 161, 161);
  border-right-style: none;
  border-right-width: 0px;
  border-top-color: rgb(161, 161, 161);
  border-top-style: none;
  border-top-width: 0px;
  box-shadow: none;
  color: rgb(161, 161, 161);
  display: block;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 400;
  gap: normal;
  justify-content: normal;
  letter-spacing: normal;
  line-height: 14px;
  opacity: 1;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  padding-top: 0px;
  text-transform: uppercase;
}
```

Ancestor backgrounds (outermost first):

Layer | Background color | Background image | Opacity
--- | --- | --- | ---
1 | rgb(0, 0, 0) | none | 1
2 | rgb(0, 0, 0) | none | 1
3 | rgb(0, 0, 0) | none | 1

### Button 3

Observed text or placeholder: MOTION ON

```css
button.motion-toggle {
  align-items: center;
  backdrop-filter: none;
  background-color: rgba(0, 0, 0, 0);
  background-image: none;
  border-bottom-color: rgb(237, 237, 237);
  border-bottom-style: none;
  border-bottom-width: 0px;
  border-left-color: rgb(237, 237, 237);
  border-left-style: none;
  border-left-width: 0px;
  border-radius: 0px;
  border-right-color: rgb(237, 237, 237);
  border-right-style: none;
  border-right-width: 0px;
  border-top-color: rgb(237, 237, 237);
  border-top-style: none;
  border-top-width: 0px;
  box-shadow: none;
  color: rgb(237, 237, 237);
  display: flex;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 400;
  gap: 6px;
  justify-content: center;
  letter-spacing: 0.35px;
  line-height: 14px;
  opacity: 1;
  padding-bottom: 0px;
  padding-left: 6px;
  padding-right: 6px;
  padding-top: 0px;
  text-transform: uppercase;
}
```

Ancestor backgrounds (outermost first):

Layer | Background color | Background image | Opacity
--- | --- | --- | ---
1 | rgb(0, 0, 0) | none | 1
2 | rgb(0, 0, 0) | none | 1
3 | rgb(0, 0, 0) | none | 1

## Layout measurements

Element | Width | Display | Columns | Gap | Padding (T R B L)
--- | --- | --- | --- | --- | ---
main | 1512px | grid | 1445.48px | normal | 0px 33.264px 0px 33.264px
header | 1445px | grid | 669.742px 104px 669.742px | normal | 0px 0px 0px 0px
section | 1445px | grid | 638.055px 460.242px 345.188px | normal | 0px 0px 0px 0px
section | 1445px | grid | 877.406px 566.078px | normal | 0px 0px 0px 0px
footer | 1445px | grid | 650.938px 81.6016px 650.945px | 14px | 0px 16px 0px 16px

## Responsive conditions

- `(max-width: 860px)`
- `(max-height: 600px)`
- `(prefers-reduced-motion: reduce)`
- `(max-width: 600px)`
- `(max-width: 999px)`
- `(width &lt;= 680px)`
- `(width &lt;= 520px)`
- `(width &lt;= 600px)`
- `(width &lt;= 999px)`
- `(width &gt;= 861px)`
- `(width &lt;= 860px)`
- `(width &lt;= 360px)`
- `(hover: hover) and (pointer: fine)`
- `(width &gt;= 861px) and (width &lt;= 1200px)`
- `(width &gt;= 861px) and (height &lt;= 740px)`
- `(width &lt;= 1100px)`

## CSS custom properties

Names and values read from the root element; no new token names or ramps were generated.

Property | Value
--- | ---
--lt-color-gray-900 | #111213
--qb-highlight-underline-offset | 2px
--qb-highlight-grammar-error-emphasized-background-color | rgba(220, 38, 38, 0.1)
--qb-highlight-sentence-from-hover-background-color | rgba(67, 67, 67, 0.1)
--qb-highlight-sentence-from-caret-background-color | rgba(67, 67, 67, 0.1)
--qb-highlight-selection-paraphrase-word-background-color | transparent
--lt-color-border-dark | #c2c9d6
--qb-highlight-selection-toolbox-sentence-background-color | rgb(0, 103, 197, 0.15)
--lucky-expanded-y | 72px
--lt-color-gray-600 | #5e636e
--qb-dialog-drag-handler-height | 16px
--theme-scrollbar | #555
--lt-color-gray-100 | #f8f9fc
--theme-cell | #171717
--lt-shadowActive | 0 0 8px -2px rgba(0, 0, 0, 0.1),0 6px 20px -3px rgba(0, 0, 0, 0.2)
--qb-comp-card-base-background-color | transparent
--qb-highlight-underline-thickness | 2px
--qb-highlight-grammar-error-background-color | transparent
--qb-highlight-sentence-from-caret-underline-color | #00000033
--lt-color-background-default | #f1f3f9
--qb-highlight-grammar-error-emphasized-underline-color | #df2020
--lt-color-text-light | #5e636e
--qb-highlight-selection-toolbox-word-underline-color | #00000033
--lt-color-gray-700 | #2f3237
--qb-highlight-word-from-hover-underline-color | transparent
--qb-highlight-grammar-error-underline-color | #f2a6a6
--lt-color-border-light | #f1f3f9
--qb-highlight-selection-paraphrase-word-underline-color | #0042d7
--font-serif-accent | Georgia, "Times New Roman", Times, serif
--lt-color-transparent | rgba(255, 255, 255, 0)
--lt-color-overlay-default | #fff
--theme-header | #000000f5
--font-mono | "IBM Plex Mono", ui-monospace, monospace
--lt-color-background-light | #f8f9fc
--qb-dialog-container-width | 320px
--lt-color-border-default | #dee3ed
--qb-highlight-selection-paraphrase-phrase-underline-color | #0042d7
--qb-highlight-selection-paraphrase-sentence-background-color | rgb(0, 103, 197, 0.15)
--qb-highlight-word-from-caret-background-color | rgba(67, 67, 67, 0.1)
--qb-highlight-selection-paraphrase-sentence-underline-color | transparent
--qb-highlight-word-from-hover-background-color | rgba(67, 67, 67, 0.1)
--lt-color-black | #111213
--qb-highlight-style-error-background-color | transparent
--lt-color-overlay-transparent | rgba(0, 0, 0, 0.1)
--qb-highlight-style-error-selected-underline-color | #b4b4b4
--lt-shadowDefault | 0 2px 6px -1px rgba(0, 0, 0, 0.16),0 1px 4px -1px rgba(0, 0, 0, 0.04)
--qb-toolbox-onboarding-cta-pulse-color | rgba(23, 135, 51, 0.8)
--qb-highlight-sentence-from-hover-underline-color | transparent
--lt-shadow-website-overlay | 0 0 7px 0 rgba(0, 0, 0, 0.3)
--qb-highlight-spelling-error-emphasized-underline-color | #df2020
--qb-highlight-selection-toolbox-phrase-background-color | rgb(0, 103, 197, 0.15)
--qb-highlight-selection-toolbox-word-background-color | rgba(67, 67, 67, 0.1)
--qb-dialog-container-height | 650px
--lt-color-overlay-dark | #fff
--qb-highlight-spelling-error-emphasized-background-color | rgba(220, 38, 38, 0.1)
--font-sans | "Bricolage Grotesque", Arial, sans-serif
--qb-highlight-word-from-caret-underline-color | transparent
--theme-muted | #a1a1a1
--theme-page | #000
--theme-marker | #555

## Capture coverage

- 0 stylesheet(s) could not be inspected. Computed styles are still measured.
- Sampling excludes hidden elements and Sitepeel tools. Offscreen rendered elements may be included. Counts refer to the sample, not the entire website.
- Colors are CSS values, not a screenshot pixel palette. Images, compositing and gradients can affect their visible appearance.
- Hover, focus, active states, other viewport sizes, iframe documents and shadow trees need separate captures.
- No inferred brand personality, invented colors, placeholder copy or unobserved code is presented as a page measurement.
