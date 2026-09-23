# LTVF Dashboard — SAP BTP Live Connection Setup Guide

This guide covers everything needed to connect the LTVF Dashboard to your on-premise SAP system
via SAP BTP Cloud Connector. Follow the sections in order.

---

## Architecture Overview

```
Browser
  |
  | HTTPS
  v
CF Approuter (BTP US10-003)
  |
  | /api/* proxy
  v
ltvf-backend (CF Python app)
  |
  | Step 1: OAuth2 token  <-- XSUAA (from Destination Service VCAP_SERVICES)
  | Step 2: Resolve dest  <-- Destination Service API  (LTVF_ONPREMISE)
  | Step 3: OData call    <-- HTTP via on-premise proxy
  v
BTP Connectivity Service proxy (connectivity.cf.us10-003.hana.ondemand.com:20003)
  |
  | Encrypted outbound tunnel
  v
Cloud Connector (server inside corporate network, outbound HTTPS only)
  |
  | Internal HTTP
  v
SAP ECC/S4 ABAP
  --> SICF service: /sap/opu/odata/sap/CNVLTVF3_SRV
  --> Entity set:   LTVFResultSet
```

---

## PART 1 — SAP Prerequisites (BASIS team)

### 1.1 Activate the CNVLTVF3 OData Service

1. Log in to SAP GUI with BASIS authorisation.
2. Run transaction **SICF** (Service Activation).
3. Navigate tree: `default_host > sap > opu > odata > sap > CNVLTVF3_SRV`
4. Right-click the service node → **Activate Service**.
5. Confirm by also activating `/sap/opu/odata/sap/CNVLTVF3_SRV/`.

### 1.2 Create a Service Account

1. Run transaction **SU01** → create a dialog or system user, e.g. `SVC_LTVF`.
2. Assign authorisation role **`/DMF/LTVF_VIEWER`** (or equivalent read-only role for CNVLTVF3).
3. Ask BASIS to confirm the account can call the OData service.

### 1.3 Test the OData URL from the SAP network

From a browser/curl **inside the corporate network** that can reach the SAP host:

```
https://<sap-host>:<port>/sap/opu/odata/sap/CNVLTVF3_SRV/LTVFResultSet?sap-client=<client>&$format=json&$top=1
```

Expected: HTTP 200 with `{"d":{"results":[{...}]}}`

Note the **exact field names** from the JSON response — you will need them in Part 4.

---

## PART 2 — BTP Cockpit Service Setup

### 2.1 Log in to BTP Cockpit

- URL: https://cockpit.btp.cloud.sap/
- Navigate: **Global Account** → **d73dca5etrial** subaccount → **dev** space

### 2.2 Create Destination Service Instance

> Skip if `ltvf-destination-svc` already exists (it was created during MTA deploy).

1. BTP Cockpit → **Services** → **Instances and Subscriptions**
2. Check if `ltvf-destination-svc` is listed with service `destination`, plan `lite`.
3. If not: **Create** → `destination` → `lite` → name `ltvf-destination-svc`.

### 2.3 Create Connectivity Service Instance

1. BTP Cockpit → **Services** → **Instances and Subscriptions** → **Create**
2. Service: **Connectivity** | Plan: **lite** | Name: **`ltvf-connectivity-svc`**
3. Click **Create**.

> The connectivity service is what allows ltvf-backend to reach your on-premise SAP
> through the Cloud Connector tunnel.

### 2.4 Bind Services to ltvf-backend

If you deploy via **MTA** (`bash deploy-cf.sh`), the `mta.yaml` now binds both services
automatically. Credentials are injected into `VCAP_SERVICES` — no manual config needed.

Alternatively, bind manually via CF CLI:
```bash
cf bind-service ltvf-backend ltvf-destination-svc
cf bind-service ltvf-backend ltvf-connectivity-svc
cf restart ltvf-backend
```

### 2.5 Create the Named Destination

1. BTP Cockpit → **Connectivity** → **Destinations** → **New Destination**
2. Fill in the form:

| Field              | Value                                          |
|--------------------|------------------------------------------------|
| Name               | `LTVF_ONPREMISE`                               |
| Type               | HTTP                                           |
| URL                | `http://<sap-virtual-host>:<virtual-port>`     |
| Proxy Type         | **OnPremise**                                  |
| Authentication     | BasicAuthentication                            |
| User               | `SVC_LTVF` (your SAP service account)          |
| Password           | (SAP service account password)                 |

3. Under **Additional Properties**, click **New Property**:
   - `sap-client` = `100` (or your SAP client number)

4. Click **Save**, then **Check Connection**.
   - A green tick means the Cloud Connector is reachable and the SAP host responds.
   - A red cross means Cloud Connector is not yet set up (continue to Part 3).

> Note: `<sap-virtual-host>` and `<virtual-port>` are the **virtual** names you will configure
> in Cloud Connector (Step 3.4). They do NOT have to match the real internal SAP hostname.
> A common convention is to use the same names as the real host for simplicity.
---

## PART 3 — Cloud Connector Installation and Configuration

The Cloud Connector is a Java-based reverse proxy that you install on a server
inside your corporate network. It makes an **outbound-only HTTPS connection** to BTP—
no inbound firewall rules needed.

### 3.1 System Requirements

| Requirement      | Minimum Specification                              |
|------------------|----------------------------------------------------|
| OS               | Windows Server 2016+ or Linux (RHEL/SLES/Ubuntu)  |
| Java             | SAP JVM 8 (bundled) or OpenJDK 11+                |
| RAM              | 2 GB (4 GB recommended)                           |
| Disk             | 2 GB free                                         |
| Network outbound | HTTPS port 443 to `*.hana.ondemand.com`           |
| Network inbound  | Port 8443 (admin UI, localhost only is fine)      |
| SAP reachability | HTTP to SAP host:port from this server            |

### 3.2 Download Cloud Connector

1. Go to: https://tools.hana.ondemand.com/#cloud
2. Scroll to section **SAP Cloud Connector**.
3. Download the installer for your OS:
   - **Windows**: `sapcc-<version>-windows-x64.zip` (portable) or `.msi` (service installer)
   - **Linux**:   `sapcc-<version>-linux-x64.tar.gz`
4. You need an SAP S-User to download. Ask your SAP BASIS team if you do not have one.

### 3.3 Install Cloud Connector

#### Windows (Recommended for trial)

```powershell
# 1. Extract the zip to e.g. C:\SCC
#    (or run the .msi installer which registers it as a Windows service)

# 2. If using portable zip, start manually:
cd C:\SCC
go.bat

# 3. Or install as a Windows service (from MSI or manually):
sc create "SAP Cloud Connector" binPath= "C:\SCC\scc.exe"
sc start "SAP Cloud Connector"
```

#### Linux

```bash
# 1. Extract
mkdir /opt/scc
tar -xzf sapcc-<version>-linux-x64.tar.gz -C /opt/scc
cd /opt/scc

# 2. Start manually
./go.sh

# 3. Or install as systemd service
cat > /etc/systemd/system/scc.service << EOF
[Unit]
Description=SAP Cloud Connector
After=network.target

[Service]
Type=forking
ExecStart=/opt/scc/go.sh start
ExecStop=/opt/scc/go.sh stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable scc
systemctl start scc
```

### 3.4 Initial Setup via Admin UI

1. Open browser on the server: `https://localhost:8443`
   (Accept the self-signed certificate warning)
2. Login: Username `Administrator` / Password `manage`
3. **Change the password immediately** when prompted.

### 3.5 Connect Cloud Connector to Your BTP Subaccount

1. In the Cloud Connector admin UI, click **+ Add Subaccount**.
2. Fill in:

| Field               | Value                                               |
|---------------------|-----------------------------------------------------|
| Region Host         | `cf.us10-003.hana.ondemand.com`                     |
| Subaccount          | `d73dca5etrial`                                     |
| Display Name        | `LTVF Trial`                                        |
| Login Email         | Your SAP BTP email (hariprasad.velu@sap.com)        |
| Password            | Your BTP password                                   |
| Location ID         | (leave blank unless you have multiple SCCs)         |

3. Click **Save**. Status should turn **green** (Connected).

> If it stays red:
> - Check outbound HTTPS to `*.hana.ondemand.com` port 443 is allowed
> - Check the Region Host matches your BTP subaccount region

### 3.6 Expose the SAP System

1. In Cloud Connector admin, select your subaccount `LTVF Trial`.
2. Go to **Cloud To On-Premise** tab → **Add** (+ icon).
3. Fill in the **Back-end System Mapping** wizard:

| Field            | Value                                    |
|------------------|------------------------------------------|
| Back-end Type    | ABAP System                              |
| Protocol         | HTTP                                     |
| Internal Host    | `<real SAP hostname>` e.g. `sap-ecc.corp.local` |
| Internal Port    | `8000` (or your ICM HTTP port)           |
| Virtual Host     | `sap-ecc.corp.local` (can match internal)|
| Virtual Port     | `8000`                                   |
| Principal Type   | None                                     |

4. Click **Finish**.
5. Now click the **+** icon under **Resources** for your new mapping:

| Field       | Value                              |
|-------------|------------------------------------|
| URL Path    | `/sap/opu/odata/sap/CNVLTVF3_SRV` |
| Active      | **Checked**                        |
| Access Policy | Path and all sub-paths           |

6. Click **Save**.
7. The resource row should show a green dot.

> The BTP Destination URL must use the **virtual** host:port you set here.
> e.g. `http://sap-ecc.corp.local:8000`

### 3.7 Verify from BTP Cockpit

1. BTP Cockpit → **Connectivity** → **Cloud Connectors**
2. Your SCC should appear with status **Connected** and location shown.
3. Click **Check Connection** on the `LTVF_ONPREMISE` destination.
4. It should return HTTP 200 or 401 (SAP OData responds — 401 just means auth needed, that is fine).
---

## PART 4 — Deploy Updated Code

### 4.1 What Changed in This Deploy

| File                     | Change                                                      |
|--------------------------|-------------------------------------------------------------|
| `backend/btp_client.py`  | VCAP_SERVICES auto-detection; connectivity proxy auth header|
| `mta.yaml`               | Added `ltvf-connectivity-svc` resource + backend binding    |
| `backend/manifest.yml`   | Added CF service bindings; updated ALLOWED_ORIGINS          |

### 4.2 Deploy via BAS Terminal

```bash
# In BAS terminal (inside ltvf-dashboard project):
git pull
bash deploy-cf.sh
```

The deploy will:
1. Build the MTA archive
2. Create `ltvf-connectivity-svc` if it does not exist
3. Bind both destination and connectivity services to `ltvf-backend`
4. Restart `ltvf-backend` with `VCAP_SERVICES` populated automatically

### 4.3 Verify VCAP_SERVICES

After deploy, confirm services are bound:

```bash
cf env ltvf-backend | grep -A 5 destination
cf env ltvf-backend | grep -A 5 connectivity
```

You should see both service blocks in the VCAP_SERVICES JSON output.

---

## PART 5 — OData Field Name Verification

The default field names are set for the standard CNVLTVF3_SRV OData service.
If your SAP BASIS team exposed the service with different field names, override them.

### 5.1 Discover Actual Field Names

From the SAP network (or via curl through Cloud Connector once connected), call:

```
https://<sap-host>/sap/opu/odata/sap/CNVLTVF3_SRV/LTVFResultSet?$top=1&$format=json
```

Look at the JSON response. Map each field to the override env var:

| Dashboard Field | Default OData Name | Override Env Var            |
|-----------------|--------------------|-----------------------------||
| Test name/label | `Description`      | `ODATA_FIELD_TEST_NAME`     |
| Match rate %    | `MatchRate`        | `ODATA_FIELD_RATE_PCT`      |
| Diff count      | `DiffCount`        | `ODATA_FIELD_DIFF`          |
| Missing count   | `MissingCount`     | `ODATA_FIELD_MISSING`       |
| Unexpected      | `UnexpectedCount`  | `ODATA_FIELD_UNEXPECTED`    |
| Equal count     | `EqualCount`       | `ODATA_FIELD_EQUAL`         |
| Source volume   | `SourceVolume`     | `ODATA_FIELD_SOURCE`        |
| Target volume   | `TargetVolume`     | `ODATA_FIELD_TARGET`        |
| Hierarchy level | `HierarchyLevel`   | `ODATA_FIELD_LEVEL`         |
| Parent node ID  | `ParentNodeId`     | `ODATA_FIELD_PARENT_ID`     |
| Node ID         | `NodeId`           | `ODATA_FIELD_NODE_ID`       |
| Is group flag   | `IsGroup`          | `ODATA_FIELD_IS_GROUP`      |
| Entity set name | `LTVFResultSet`    | `ODATA_ENTITY_SET`          |

### 5.2 Set Overrides on CF Backend

If any field names differ:

```bash
cf set-env ltvf-backend ODATA_FIELD_TEST_NAME YourActualFieldName
cf restart ltvf-backend
```

Or add them to `backend/manifest.yml` under `env:` and redeploy.

---

## PART 6 — Test and Verify

### 6.1 API Health Check

```bash
curl https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/health
# Expected: {"status":"ok","version":"3.0.0"}
```

### 6.2 BTP Config Status

```bash
curl https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/sap/status
```

Expected when configured:
```json
{
  "available": true,
  "configured": true,
  "vcap_dest_bound": true,
  "vcap_conn_bound": true,
  "destination_name": "LTVF_ONPREMISE",
  "missing_vars": []
}
```

### 6.3 Connection Test (3-step)

```bash
curl https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/sap/test
```

Expected when all configured:
```json
{
  "ok": true,
  "steps": [
    {"step": "XSUAA OAuth2 token",     "ok": true, "detail": "Token acquired from BTP XSUAA"},
    {"step": "Resolve destination ...", "ok": true, "detail": "URL: http://sap-ecc:8000 | ProxyType: OnPremise"},
    {"step": "SAP OData probe ...",     "ok": true, "detail": "HTTP 200 - 1 record(s) returned"}
  ]
}
```

### 6.4 From the Dashboard UI

1. Open https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com
2. Click the **BTP** button in the header toolbar.
3. Status badge should show **CONFIGURED** (green).
4. Click **Run Connection Test** — all 3 steps should show green ticks.
5. Close the panel and click **Fetch from SAP** — live CNVLTVF3 data loads.

---

## PART 7 — Troubleshooting

| Symptom                        | Cause                              | Fix                                                     |
|--------------------------------|------------------------------------|---------------------------------------------------------|
| `configured: false`            | VCAP_SERVICES not populated        | `cf bind-service ltvf-backend ltvf-destination-svc` then restart |
| XSUAA token step fails         | Wrong destination service creds    | `cf env ltvf-backend` - check VCAP_SERVICES has destination block |
| Destination resolve fails      | `LTVF_ONPREMISE` not found         | Create destination in BTP cockpit with exact name       |
| OData probe: Network/proxy err | Cloud Connector not running        | Start SCC service; check SCC admin UI shows Connected   |
| OData probe: HTTP 404          | CNVLTVF3_SRV not activated         | Run SICF in SAP, activate the service                   |
| OData probe: HTTP 401          | Wrong SAP credentials in dest      | Update User/Password in BTP Destination                 |
| OData probe: HTTP 403          | SAP user lacks authorisation       | Ask BASIS to add /DMF/LTVF_VIEWER role to SVC_LTVF     |
| Empty data returned            | Wrong OData field names            | Call $top=1, check field names, set ODATA_FIELD_* vars  |
| SCC shows red / disconnected   | BTP region host wrong              | Use `cf.us10-003.hana.ondemand.com` (not `cf.us10.hana.ondemand.com`) |
| Proxy-Authorization error      | Connectivity service not bound     | `cf bind-service ltvf-backend ltvf-connectivity-svc; cf restart ltvf-backend` |

---

## Quick Reference: CF CLI Commands

```bash
# Check what services are bound
cf services

# Check VCAP_SERVICES for ltvf-backend
cf env ltvf-backend

# Manually bind a service
cf bind-service ltvf-backend ltvf-connectivity-svc

# Set an env var without redeploy
cf set-env ltvf-backend SAP_DESTINATION_NAME LTVF_ONPREMISE
cf restart ltvf-backend

# Tail live logs
cf logs ltvf-backend --recent
cf logs ltvf-backend  # live stream

# Check app status
cf app ltvf-backend
```