## MODIFIED Requirements

### Requirement: TLS certificate authority for external MongoDB
Both editions. When `DATABASE_TLS_CA_FILE` is set, the dashboard SHALL connect with TLS and trust the PEM
bundle at that path (for MongoDB services whose certificates a private CA signs).

#### Scenario: Private CA accepted
- **GIVEN** a MongoDB server presenting a certificate signed by a private CA and `DATABASE_TLS_CA_FILE`
  pointing to that CA
- **WHEN** the dashboard starts
- **THEN** the connection succeeds

#### Scenario: Unreadable CA file
- **GIVEN** `DATABASE_TLS_CA_FILE` pointing to a missing or unreadable file
- **WHEN** the dashboard starts
- **THEN** it logs the path and exits with code 1
