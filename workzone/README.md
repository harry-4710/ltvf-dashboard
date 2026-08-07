# SAP Build Work Zone — LTVF Dashboard Integration

This folder contains the files needed to register the LTVF Cloud Dashboard as a native tile in SAP Build Work Zone (Fiori Launchpad). Hand this package to the **Work Zone administrator** — no dashboard code changes are required.

---

## What's Included

| File | Purpose |
|---|---|
| `cdm.json` | Content Descriptor Manifest — use as a reference for the values to enter manually |
| `README.md` | This guide |

---

## Tile Details

| Property | Value |
|---|---|
| Title | LTVF Cloud Dashboard |
| Subtitle | SAP Migration Test Results |
| Icon | `sap-icon://chart-bar` |
| Target URL | `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com` |
| Navigation type | URL (external) |
| CDM version | 3.0 |
| Catalog | LTVF Tools (`ltvf.catalog`) |
| Group | SAP Migration (`ltvf.group`) |

---

## Import Steps

### 1. Open Content Manager

1. Open **SAP Build Work Zone** → **Site Manager** (admin cockpit).
2. Click **Content Manager** in the left navigation.

### 2. Register the App in Content Manager

Use `cdm.json` as a reference for the values below.

**Create the App:**

1. Click **+ Create** → **App**.
2. Enter the following values (from `cdm.json`):
   - **Title:** `LTVF Cloud Dashboard`
   - **Subtitle:** `SAP Migration Test Results`
   - **Icon:** `sap-icon://chart-bar`
   - **App UI Technology:** URL
   - **URL:** `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`
3. Save.

**Create the Catalog:**

1. Click **+ Create** → **Catalog**.
2. **Title:** `LTVF Tools`
3. In the **Apps** assignment section, add **LTVF Cloud Dashboard**.
4. Save.

**Create the Group:**

1. Click **+ Create** → **Group**.
2. **Title:** `SAP Migration`
3. In the **Tiles** assignment section, add **LTVF Cloud Dashboard**.
4. Save.

### 3. Add the Tile to a Page

1. In Content Manager, go to **Pages** (or open an existing page to edit).
2. Click **Edit Page** → **Add Widget** → **Tiles**.
3. Search for **LTVF Cloud Dashboard** in the tile picker.
4. Drag it onto the page (or click **Add**).
5. Save the page.

### 4. Assign Roles (Optional)

By default the tile is visible to everyone. To restrict access:

1. In Content Manager, click the **LTVF Cloud Dashboard** app entry.
2. Go to the **Assignments** tab → **Roles**.
3. Assign the relevant business role(s).
4. Save.

### 5. Publish the Site

1. Return to **Site Manager** → click your site.
2. Click **Publish** (or **Save & Publish**).
3. Changes are live once publishing completes.

---

## Verification

After publishing, open the Work Zone site as an end-user:

- [ ] The tile appears in the **SAP Migration** group.
- [ ] The tile shows title **LTVF Cloud Dashboard**, subtitle **SAP Migration Test Results**, and a bar-chart icon.
- [ ] Clicking the tile opens `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`.
- [ ] The dashboard loads and the **Load Latest from SAP** button is visible.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Import fails with validation error | CDM schema mismatch | Verify the `_version` field is `"3.0"` and IDs have no spaces |
| 403 / "Not Authorized" on click | User not assigned the app's role | Assign the correct role in Content Manager → App → Assignments |
| Tile not visible in the site | Page not published or tile not added to page | Re-check step 3 and publish again |
| Icon shows as question mark | Icon string not recognized | Confirm `sap-icon://chart-bar` is spelled correctly in `cdm.json` |
| White screen after click | AppRouter login issue | Open the target URL directly in a browser to check CF login |
