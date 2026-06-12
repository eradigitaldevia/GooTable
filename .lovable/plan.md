We will make a small adjustment in `src/components/admin/admin-sidebar.tsx` to alter the styling of the sidebar group headers as requested:

- Change the font size of the group headers from `text-[10px]` to `text-[11px]` to make them slightly larger.
- Change the color from `text-muted-foreground` to `text-primary` (the application's default warm orange brand color).

### Proposed Changes

#### File: `src/components/admin/admin-sidebar.tsx`

- Modify the class list of the group header rendering:
```tsx
// From:
"px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",

// To:
"px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-primary",
```
