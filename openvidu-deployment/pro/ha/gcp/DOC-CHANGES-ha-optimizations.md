# Documentation changes for `ha-optimizations` (GCP HA deployment)

Instructions for the Claude working on the docs repo
`/home/sergio/Escritorio/openvidu/openvidu.io` (branch `next`, already up to date).

These instructions derive from the changes applied in
`openvidu-deployment/pro/ha/gcp/tf-gpc-openvidu-ha.tf` on the `ha-optimizations` branch
(parallelization of the 4 master nodes, static internal IPs for the masters,
wait timeouts, robust installer fetch, and `depends_on` on the APIs).

SUMMARY: the ONLY content change required is the two deployment time figures in
GCP HA's `install.md`. Everything else (public parameters, screenshots, other clouds,
other deployment types, on-node config files) stays the same. Read it in full before
touching anything.

---

## (a) Time figures to update — MANDATORY

File: `docs/docs/self-hosting/ha/gcp/install.md`

There are TWO occurrences of "7 to 12 minutes" in this file (approx. lines 249 and 308).
Locate them by the literal text; do not rely only on the line number (it may have
shifted). Replace the figure with the placeholder and leave a note to fill it in with
the actual measurement from `ov-cloud-tester` after these changes (the deployment is now
faster: masters run in parallel and there is no more IP handshake via Secret Manager).

### Occurrence 1 (section "## Deploying the stack", ~line 249)

Current literal text:

```
When you are satisfied with your input values, click _"Continue"_ and then _"Create deployment"_. The deployment will be validated and all resources will be created. Wait around 7 to 12 minutes for the nodes to install OpenVidu.
```

Proposed text (fill in `X`/`Y` with the measurement from `ov-cloud-tester`):

```
When you are satisfied with your input values, click _"Continue"_ and then _"Create deployment"_. The deployment will be validated and all resources will be created. Wait around X to Y minutes for the nodes to install OpenVidu.
```

### Occurrence 2 (section "## Checking...", ~line 308)

Current literal text:

```
When your Google Cloud Platform deployment reaches the **`Active`** state, it means that all resources have been created. You will need to wait about 7 to 12 minutes for the instances to install OpenVidu, as mentioned before. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

Proposed text (fill in `X`/`Y` with the measurement from `ov-cloud-tester`):

```
When your Google Cloud Platform deployment reaches the **`Active`** state, it means that all resources have been created. You will need to wait about X to Y minutes for the instances to install OpenVidu, as mentioned before. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

> Placeholder to fill in: `X to Y minutes — fill in with the measurement from ov-cloud-tester`.
> Keep both occurrences with the SAME figure (the second one says "as mentioned before").

### Do NOT touch the figures in other files

These changes affect ONLY GCP HA. Do NOT modify the "7 to 12 minutes" figures
that appear in other documents (they belong to other clouds / other deployment types and
are out of scope for this work):

- `docs/docs/self-hosting/elastic/gcp/install.md` (lines ~236 and ~295)
- `docs/docs/self-hosting/elastic/azure/install.md` (lines ~95 and ~149)
- Any other `install.md` in the docs.

---

## (b) GCP template public parameters: NO CHANGES — confirmation

Do not touch parameter tables or screenshots in the parameters section.

Reason: the new static IPs of the master nodes are **internal**
(`google_compute_address` with `address_type = "INTERNAL"`, reserved within the
region's `default` subnet) and are assigned via `network_interface.network_ip`. No
Terraform input or output variable has been added, removed, or renamed
(`variables.tf` and `output.tf` unchanged). Therefore:

- The "Mandatory Parameters" and "Optional Parameters" table in
  `docs/docs/self-hosting/ha/gcp/install.md` (approx. lines 95–230) **stays the same**.
- There are no new parameters the user needs to enter in Infrastructure Manager.
- The parameter form screenshots **do not change**.

---

## (c) Other statements in the GCP HA docs that may become outdated

The entire GCP HA documentation (`docs/docs/self-hosting/ha/gcp/*.md`) and the shared
includes have been reviewed. Conclusions:

### c.1 — Secret Manager secrets `MASTER_NODE_{1..4}_PRIVATE_IP` (REMOVED)

In `ha-optimizations`, the 4 Secret Manager secrets
`MASTER_NODE_1_PRIVATE_IP` … `MASTER_NODE_4_PRIVATE_IP` have been removed from the
deployment (they are no longer generated: the masters' IPs are now static and are
passed via metadata). The GCP HA docs **do not mention them by name in the text**, so
there is no text to fix.

- Only possible impact: the Secret Manager screenshot in
  `install.md` (section "Check deployment outputs in GCP Secret Manager"),
  image `assets/images/platform/self-hosting/shared/gcp/secrets-manager.png`.
  That screenshot COULD show the 4 IP secrets that will no longer exist. It is purely
  cosmetic (the text only says "you will see all the secrets by their name"). OPTIONAL
  action: if the screenshot is regenerated at some point, do it after a deployment with
  `ha-optimizations`. This is NOT blocking for this change.

### c.2 — `backup-and-restore.md`: DO NOT TOUCH

`docs/docs/self-hosting/how-to-guides/backup-and-restore.md` (approx. lines 676–692)
documents the variables `MASTER_NODE_1_PRIVATE_IP` … `MASTER_NODE_4_PRIVATE_IP` inside
the on-node configuration file `/opt/openvidu/config/node/master-node.env`.

IMPORTANT: **these are NOT the removed secrets**. They are configuration file
variables that the installer still writes based on the
`--master-node-private-ip-list` flag (which is still passed, now derived from the
static IPs). That flow does not change. **Do not modify `backup-and-restore.md`.**

### c.3 — `upgrade.md`: DO NOT TOUCH

`docs/docs/self-hosting/ha/gcp/upgrade.md` (line ~91) mentions `store_secret.sh` and
the `OPENVIDU_VERSION` secret. Neither the `store_secret.sh` script nor the
`OPENVIDU_VERSION` secret has been touched. **No changes required.**

### c.4 — Internal flow (ALL_SECRETS_GENERATED, IP handshake): not documented

The internal coordination mechanism (master-1 leader generates secrets and marks
`ALL_SECRETS_GENERATED`, polling, etc.) is not publicly documented, and its change
(removal of the IP exchange via Secret Manager) does not change anything user-facing.
There is no text to update.

---

## Implementation checklist

- [ ] In `docs/docs/self-hosting/ha/gcp/install.md`, replace "7 to 12 minutes" with
      "X to Y minutes" in the TWO occurrences (~249 and ~308), using the same figure in both.
- [ ] Measure the actual deployment time with `ov-cloud-tester` on `ha-optimizations`
      and fill in `X`/`Y`.
- [ ] Verify that NO parameter tables or screenshots have been touched.
- [ ] Verify that `backup-and-restore.md`, `upgrade.md`, and the elastic/azure/other
      clouds time figures have NOT been touched.
- [ ] (Optional) Regenerate `secrets-manager.png` if you want to reflect the absence of
      the 4 IP secrets.
