# Supabase folder (data layer, not MVC UI)

`supabase/` holds SQL migrations, seeds, and schema helpers. In a full-stack sense this is the **persistence / data** side that **backend models** talk to — not a separate View or Controller folder. Keep schema changes here; keep HTTP and app logic in `backend/`.
