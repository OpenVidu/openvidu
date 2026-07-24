# Documentation changes for `ha-optimizations` (Azure HA deployment)

Instructions for the Claude working on the docs repo
`/home/sergio/Escritorio/openvidu/openvidu.io` (branch `next`, already up to date).

These instructions derive from the changes applied in
`openvidu-deployment/pro/ha/azure/cf-openvidu-ha.bicep`,
`openvidu-deployment/pro/ha/azure/cf-openvidu-ha.json` (recompiled) and
`openvidu-deployment/pro/ha/azure/createUiDefinition.json` on the `ha-optimizations`
branch. Functional summary of what changed in the deployment:

- The 4 master VMs are now created in parallel (the `dependsOn` chain
  MasterNode2→1, 3→2, 4→3 was removed; coordination stays data-driven via Key Vault).
- Media Nodes now install (Docker + image pulls) **in parallel** with the masters,
  instead of waiting idle until all masters finished before starting to install.
- The master-node-4 single point of failure was removed: readiness
  (`FINISH-MASTER-NODE`) is now published by the **first healthy master**, right after
  its own health check, and a fixed `sleep 150` was removed.
- Wait timeouts hardened (Key Vault availability and the blob-storage config retry
  raised from 100s to 300s; the previously unbounded polls are now bounded to 30 min),
  and the installer download is now retried and validated (`curl --retry 8 ... -o file`
  + non-empty check) instead of the fragile `sh <(curl ...)`.
- Bug fix in `createUiDefinition.json`: the portal now maps the "Container Name" field
  to the correct template parameter (`appDataContainerName`) — see section (b).

SUMMARY: the ONLY content change required in the docs is the two deployment time
figures in Azure HA's `install.md`. Everything else (public parameters, screenshots,
the "Container Name" field description, other clouds, other deployment types) stays the
same. Read this file in full before touching anything.

---

## (a) Time figures to update — MANDATORY

File: `docs/docs/self-hosting/ha/azure/install.md`

There are TWO deployment-time figures in this file. Locate each by its literal text
(line numbers below are approximate and may have shifted). The deployment is now
faster (masters run in parallel and the media install overlaps with the masters'
install, plus the fixed 150s sleep is gone), so both figures must be re-measured.

### Occurrence 1 (section "## Deploying the stack", ~line 97)

Current literal text:

```
Whenever you are satisfied with your Template parameters, just click on _"Next"_ to trigger the validation process. If correct, click on _"Create"_ to start the deployment process (which will take about 10 to 15 minutes).
```

Proposed text (fill in `X`/`Y` with the measurement from `ov-cloud-tester`):

```
Whenever you are satisfied with your Template parameters, just click on _"Next"_ to trigger the validation process. If correct, click on _"Create"_ to start the deployment process (which will take about X to Y minutes).
```

### Occurrence 2 (section "## Configuration and administration", ~line 181)

Current literal text:

```
When your Azure stack reaches the **`Succeeded`** status, it means that all resources have been created. You will need to wait about 5 to 10 minutes for the instance to install OpenVidu. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

Proposed text (fill in `X`/`Y` with the measurement from `ov-cloud-tester`):

```
When your Azure stack reaches the **`Succeeded`** status, it means that all resources have been created. You will need to wait about X to Y minutes for the instance to install OpenVidu. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

> Placeholder to fill in: `X to Y minutes — fill in with the measurement from ov-cloud-tester`.
> The two figures are independent (occurrence 1 = full stack creation time; occurrence 2
> = extra wait after `Succeeded` for OpenVidu to install). Measure and fill each on its own.

### Do NOT touch the same figures in other files

- `"10 to 15 minutes"` appears ONLY in `docs/docs/self-hosting/ha/azure/install.md`, so
  there is no ambiguity for occurrence 1.
- `"5 to 10 minutes"` also appears in OTHER documents that are OUT OF SCOPE here (they
  belong to other deployment types / clouds). Do NOT modify them:
    - `docs/docs/self-hosting/single-node-pro/azure/install.md`
    - `docs/docs/self-hosting/single-node/azure/install.md`
    - `docs/docs/self-hosting/single-node-pro/gcp/install.md`
    - `docs/docs/self-hosting/single-node/gcp/install.md`
    - `shared/self-hosting/gcp/deploying-stack.md`
  Only change the occurrence inside `docs/docs/self-hosting/ha/azure/install.md`.

---

## (b) "Container Name" field fix — NO doc change needed

The bug: in `createUiDefinition.json` the portal emitted the output key `containerName`,
but the ARM/Bicep template parameter is `appDataContainerName`. Because the key did not
match, the value typed by the user in the "Container Name" field never reached the
template — a custom container name was silently ignored and the deployment always fell
back to the default `openvidu-appdata`. The fix renames only that output **key** to
`appDataContainerName` (the value still comes from the same UI field
`steps('parameters STORAGE').containerName`).

Impact on the docs: **NONE.** Explicit reasoning so you can confirm and move on:

- The visible UI element name and its label are unchanged — the form still shows a field
  labeled **"Container Name"**. Only a hidden output-mapping key changed.
- The shared snippet `shared/self-hosting/azure/storage-account.md` (included by the
  Azure HA `install.md` via `--8<--`) describes that field as:
  *"**Container Name** is the name that you desire for the container ... If you leave it
  blank it will create the container with name `openvidu-appdata`."* That description
  now matches reality in BOTH cases (blank → `openvidu-appdata`, as before; non-blank →
  the value is finally honored). The text was already written as if the field worked, so
  no wording needs to change.
- The screenshot `assets/images/platform/self-hosting/shared/azure/storageaccount.png`
  (referenced only from `shared/self-hosting/azure/storage-account.md`) shows the same
  unchanged form, so it does NOT need to be regenerated.

Action: leave `shared/self-hosting/azure/storage-account.md` and its screenshot as they
are.

---

## (c) Public template parameters / outputs: NO CHANGES — confirmation

Do not touch parameter tables or screenshots in the parameters section.

Reason: no public parameter was added, removed or renamed. `appDataContainerName` and
`storageAccountName` already existed as template parameters; the createUiDefinition fix
only corrects an existing field mapping. The Bicep template has no `outputs` section, and
none was added. Therefore:

- Any "Parameters" tables/screenshots in `docs/docs/self-hosting/ha/azure/install.md`
  and in the shared Azure snippets **stay the same**.
- There are no new fields the user must fill in the Azure portal form.
- The parameter form screenshots **do not change**.

---

## (d) Other statements in the Azure HA docs that may become outdated

The Azure HA documentation (`docs/docs/self-hosting/ha/azure/*.md`) and the shared Azure
includes (`shared/self-hosting/azure/*.md`) were reviewed against the internal changes.
Conclusions:

### d.1 — Master node ordering / parallelization: not documented

The docs never state that master nodes are created sequentially or "one by one", nor do
they describe the `dependsOn` chain. Removing it changes nothing user-facing. No text to
update.

### d.2 — `FINISH-MASTER-NODE` / master-4 SPOF / scale-in lock (`lock.txt`): not documented

The internal readiness handshake (`FINISH-MASTER-NODE`), the fact that it used to be
written only by master-4, and the `automation-locks/lock.txt` scale-in lock blob are
NOT mentioned anywhere in the docs. The scale-in behavior described in
`shared/self-hosting/azure/scale-in-config.md` (the graceful drain and its "up to 5
minutes" / Azure "15 minutes" figures) is about Azure's termination timing and is
UNCHANGED by this work — **do not touch it**.

### d.3 — Internal coordination (`ALL-SECRETS-GENERATED`, Key Vault polling): not documented

The master-1-as-leader secrets generation, the Key Vault polling, and the new bounded
timeouts are internal and not publicly documented. Nothing user-facing changes. No text
to update.

### d.4 — `admin.md`, `upgrade.md`, `index.md` (Azure HA): DO NOT TOUCH

Reviewed; none of them reference the internals that changed. No changes required.

---

## Implementation checklist

- [ ] In `docs/docs/self-hosting/ha/azure/install.md`, replace `"10 to 15 minutes"`
      (~line 97) and `"5 to 10 minutes"` (~line 181) with the re-measured
      `"X to Y minutes"` figures, located by their literal text.
- [ ] Measure the actual deployment times with `ov-cloud-tester` on `ha-optimizations`
      and fill in `X`/`Y` for each occurrence independently.
- [ ] Confirm NO parameter tables or screenshots were touched (section c).
- [ ] Confirm `shared/self-hosting/azure/storage-account.md` and `storageaccount.png`
      were left unchanged (section b).
- [ ] Confirm the `"5 to 10 minutes"` figures in single-node / single-node-pro / GCP
      docs and `shared/self-hosting/gcp/deploying-stack.md` were NOT touched (section a).
- [ ] Confirm `scale-in-config.md`, `admin.md`, `upgrade.md`, `index.md` were NOT touched
      (section d).
