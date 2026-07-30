# LTVF Dashboard — SAP Build Work Zone Integration

This folder contains the files needed to embed the LTVF Cloud Dashboard as a tile in SAP Build Work Zone (Fiori Launchpad).

**Dashboard URL:** `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`

---

## What You Get

After setup, users will see this tile in their SAP Fiori Launchpad:

```
┌─────────────────────────┐
│  📊                     │
│                         │
│  LTVF Cloud Dashboard   │
│  SAP Migration Test     │
│  Results                │
└─────────────────────────┘
```

Clicking the tile opens the LTVF Dashboard directly — no separate URL, no separate login.

---

## Setup Instructions (for Work Zone Administrator)

### Step 1 — Open SAP Build Work Zone

1. Go to your BTP Cockpit → BDV space subaccount
2. Left menu → **Services** → **Instances and Subscriptions**
3. Click **SAP Build Work Zone, standard edition** → **Go to Application**

### Step 2 — Open the Content Manager

In Work Zone, click the **Content Manager** icon (grid icon in the left sidebar).

### Step 3 — Create the App

1. Click **+ New** → **App**
2. Fill in:

| Field | Value |
|---|---|
| Title | `LTVF Cloud Dashboard` |
| Open App | `In place` or `In a new tab` |
| System | *(leave empty — external URL)* |
| App UI Technology | `URL` |
| URL | `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com` |

3. Click **Navigation** tab:

| Field | Value |
|---|---|
| Semantic Object | `LTVFDashboard` |
| Action | `display` |

4. Click **Visualization** tab:

| Field | Value |
|---|---|
| Subtitle | `SAP Migration Test Results` |
| Information | `CNVLTVF3 pass/warn/fail visualization` |
| Icon | `sap-icon://chart-bar` |

5. Click **Save**

### Step 4 — Add to a Role

1. In Content Manager → **Everyone** role (or a specific role)
2. Click **Edit**
3. Search for `LTVF Cloud Dashboard`
4. Assign it
5. Click **Save**

### Step 5 — Add to a Page (optional)

1. Content Manager → **Pages** → select your home page
2. Click **Edit** → **Add Section**
3. Search for `LTVF Cloud Dashboard` → add it
4. Click **Save** → **Publish**

### Step 6 — Test

1. Open the Work Zone site
2. Find the **LTVF Cloud Dashboard** tile
3. Click it → dashboard should open
4. Verify the **"Load Latest from SAP"** button is visible

---

## Alternative — Import via CDM (if your Work Zone supports it)

Some Work Zone versions support importing a CDM (Content Descriptor Manifest) JSON file directly:

1. Content Manager → **Import**
2. Upload `workzone/cdm.json`
3. Review and confirm
4. Assign to roles/pages as above

---

## Tile Details

| Property | Value |
|---|---|
| App ID | `ltvf.dashboard` |
| Semantic Object | `LTVFDashboard` |
| Action | `display` |
| Icon | `sap-icon://chart-bar` |
| Group | `SAP Migration` |
| Catalog | `LTVF Tools` |
| URL | `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com` |

---

## Contact

For questions about the dashboard itself: **Hariprasad**  
For Work Zone configuration: your Work Zone administrator
