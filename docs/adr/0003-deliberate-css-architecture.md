# Use handcrafted token and component CSS for the V1 interface

Cetele V1 deliberately deviates from the Tailwind CSS baseline recorded in `PRODUCT.md`. The application uses a small, single-product stylesheet organized around shared design tokens and component-level class names.

The concrete advantage is direct control over the accepted HabitKit-close composition: its dense grid geometry, paired light/dark tokens, responsive breakpoints, and interaction states remain visible together and can be tuned precisely without adding a utility framework, runtime, or additional CSS build dependency. This keeps the current interface implementation compact and aligned with the accepted visual system.

This decision does not reject Tailwind for future work. Reassess it if the product surface expands substantially, repeated styling patterns stop being manageable in the shared stylesheet, or a larger team would benefit from utility-level conventions and tooling.
