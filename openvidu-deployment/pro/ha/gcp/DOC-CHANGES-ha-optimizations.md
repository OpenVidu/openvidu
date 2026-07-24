# Cambios de documentación para `ha-optimizations` (despliegue HA GCP)

Instrucciones para el Claude que trabaje en el repo de docs
`/home/sergio/Escritorio/openvidu/openvidu.io` (rama `next`, ya actualizada).

Estas instrucciones derivan de los cambios aplicados en
`openvidu-deployment/pro/ha/gcp/tf-gpc-openvidu-ha.tf` en la rama `ha-optimizations`
(paralelización de los 4 master nodes, IPs internas estáticas para los masters,
timeouts en las esperas, fetch robusto del instalador y `depends_on` hacia las APIs).

RESUMEN: el ÚNICO cambio de contenido necesario son las dos cifras de tiempo de
despliegue en el `install.md` del HA de GCP. Todo lo demás (parámetros públicos,
capturas, otros clouds, otros deployment types, ficheros de config on-node) se
mantiene igual. Léelo entero antes de tocar nada.

---

## (a) Cifras de tiempo a actualizar — OBLIGATORIO

Fichero: `docs/docs/self-hosting/ha/gcp/install.md`

Hay DOS ocurrencias de "7 to 12 minutes" en este fichero (aprox. líneas 249 y 308).
Localízalas por el texto literal, no confíes solo en el número de línea (puede haberse
desplazado). Sustituye la cifra por el placeholder y deja una nota para rellenarla con
la medición real de `ov-cloud-tester` tras estos cambios (el despliegue ahora es más
rápido: masters en paralelo y sin el handshake de IPs por Secret Manager).

### Ocurrencia 1 (sección "## Deploying the stack", ~línea 249)

Texto actual literal:

```
When you are satisfied with your input values, click _"Continue"_ and then _"Create deployment"_. The deployment will be validated and all resources will be created. Wait around 7 to 12 minutes for the nodes to install OpenVidu.
```

Texto propuesto (rellenar `X`/`Y` con la medición de `ov-cloud-tester`):

```
When you are satisfied with your input values, click _"Continue"_ and then _"Create deployment"_. The deployment will be validated and all resources will be created. Wait around X to Y minutes for the nodes to install OpenVidu.
```

### Ocurrencia 2 (sección "## Checking...", ~línea 308)

Texto actual literal:

```
When your Google Cloud Platform deployment reaches the **`Active`** state, it means that all resources have been created. You will need to wait about 7 to 12 minutes for the instances to install OpenVidu, as mentioned before. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

Texto propuesto (rellenar `X`/`Y` con la medición de `ov-cloud-tester`):

```
When your Google Cloud Platform deployment reaches the **`Active`** state, it means that all resources have been created. You will need to wait about X to Y minutes for the instances to install OpenVidu, as mentioned before. After this time, try connecting to the deployment URL. If it doesn't work, we recommend checking the previous section. Once everything is ready, you can check the [Administration](./admin.md) section to learn how to manage your deployment.
```

> Placeholder a rellenar: `X to Y minutes — rellenar con la medición de ov-cloud-tester`.
> Mantén las dos ocurrencias con la MISMA cifra (la segunda dice "as mentioned before").

### NO tocar las cifras de otros ficheros

Estos cambios afectan SOLO al HA de GCP. NO modifiques las cifras "7 to 12 minutes"
que aparecen en otros documentos (son otros clouds / otros deployment types y están
fuera del alcance de este trabajo):

- `docs/docs/self-hosting/elastic/gcp/install.md` (líneas ~236 y ~295)
- `docs/docs/self-hosting/elastic/azure/install.md` (líneas ~95 y ~149)
- Cualquier otro `install.md` de la doc.

---

## (b) Parámetros públicos de la plantilla GCP: SIN CAMBIOS — confirmación

NO hay que tocar tablas de parámetros ni capturas de la sección de parámetros.

Motivo: las nuevas IPs estáticas de los master nodes son **internas**
(`google_compute_address` con `address_type = "INTERNAL"`, reservadas dentro de la
subred `default` de la región) y se asignan vía `network_interface.network_ip`. No se
ha añadido, eliminado ni renombrado ninguna variable de entrada ni salida de Terraform
(`variables.tf` y `output.tf` intactos). Por tanto:

- La tabla "Mandatory Parameters" y "Optional Parameters" de
  `docs/docs/self-hosting/ha/gcp/install.md` (aprox. líneas 95–230) **se queda igual**.
- No hay parámetros nuevos que el usuario deba introducir en Infrastructure Manager.
- Las capturas del formulario de parámetros **no cambian**.

---

## (c) Otras afirmaciones de la doc GCP HA que puedan quedar obsoletas

Se ha revisado toda la doc del HA de GCP (`docs/docs/self-hosting/ha/gcp/*.md`) y los
includes compartidos. Conclusiones:

### c.1 — Secretos `MASTER_NODE_{1..4}_PRIVATE_IP` de Secret Manager (ELIMINADOS)

En `ha-optimizations` se han eliminado del despliegue los 4 secretos de Secret Manager
`MASTER_NODE_1_PRIVATE_IP` … `MASTER_NODE_4_PRIVATE_IP` (ya no se generan: las IPs de
los masters son ahora estáticas y se pasan por metadata). La doc del HA de GCP **no los
menciona por nombre en el texto**, así que no hay texto que corregir.

- Único impacto posible: la captura del Secret Manager en
  `install.md` (sección "Check deployment outputs in GCP Secret Manager"),
  imagen `assets/images/platform/self-hosting/shared/gcp/secrets-manager.png`.
  Esa captura PODRÍA mostrar los 4 secretos de IP que ya no existirán. Es puramente
  cosmético (el texto solo dice "you will see all the secrets by their name"). Acción
  OPCIONAL: si se regenera la captura en algún momento, hacerlo tras un despliegue con
  `ha-optimizations`. NO es bloqueante para este cambio.

### c.2 — `backup-and-restore.md`: NO TOCAR

`docs/docs/self-hosting/how-to-guides/backup-and-restore.md` (aprox. líneas 676–692)
documenta variables `MASTER_NODE_1_PRIVATE_IP` … `MASTER_NODE_4_PRIVATE_IP` dentro del
fichero de configuración on-node `/opt/openvidu/config/node/master-node.env`.

IMPORTANTE: **esas NO son los secretos eliminados**. Son variables del fichero de
configuración que el instalador sigue escribiendo a partir del flag
`--master-node-private-ip-list` (que se sigue pasando, ahora derivado de las IPs
estáticas). Ese flujo no cambia. **No modifiques `backup-and-restore.md`.**

### c.3 — `upgrade.md`: NO TOCAR

`docs/docs/self-hosting/ha/gcp/upgrade.md` (línea ~91) menciona `store_secret.sh` y el
secreto `OPENVIDU_VERSION`. Ni el script `store_secret.sh` ni el secreto
`OPENVIDU_VERSION` se han tocado. **No requiere cambios.**

### c.4 — Flujo interno (ALL_SECRETS_GENERATED, handshake de IPs): no documentado

El mecanismo interno de coordinación (líder master-1 genera secretos y marca
`ALL_SECRETS_GENERATED`, polling, etc.) no está documentado públicamente, y su cambio
(eliminación del intercambio de IPs por Secret Manager) no altera nada de cara al
usuario. No hay texto que actualizar.

---

## Checklist de aplicación

- [ ] En `docs/docs/self-hosting/ha/gcp/install.md`, sustituir "7 to 12 minutes" por
      "X to Y minutes" en las DOS ocurrencias (~249 y ~308), con la misma cifra en ambas.
- [ ] Medir el tiempo real de despliegue con `ov-cloud-tester` sobre `ha-optimizations`
      y rellenar `X`/`Y`.
- [ ] Verificar que NO se han tocado tablas de parámetros ni capturas.
- [ ] Verificar que NO se han tocado `backup-and-restore.md`, `upgrade.md`, ni las
      cifras de tiempo de elastic/azure/otros clouds.
- [ ] (Opcional) Regenerar `secrets-manager.png` si se desea reflejar la ausencia de los
      4 secretos de IP.
