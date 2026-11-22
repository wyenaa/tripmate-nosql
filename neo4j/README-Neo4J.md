# Neo4j - Recommendation Service (Naufal)

Cluster Neo4j Enterprise 3 server, database `tripmate` dengan topologi
1 primary (`neo4j1`) + 2 secondary (`neo4j2`, `neo4j3`). Master-slave, tanpa sharding.
Detail tugas: `docs/02_NEO4J_Naufal.md`. Kesepakatan kelompok: `docs/00_KONTEKS_BERSAMA.md`.

| Container | Peran di `tripmate` | Port host (HTTP / Bolt) |
| --- | --- | --- |
| `neo4j1` | primary (write + read) | 7474 / 7687 |
| `neo4j2` | secondary (read) | 7475 / 7688 |
| `neo4j3` | secondary (read) | 7476 / 7689 |

Login: `neo4j / tripmate123` (hanya untuk demo).

## Isi folder

| File | Isi |
| --- | --- |
| `docker-compose.yml` | 3 container Neo4j di network `tripmate-net` |
| `conf/neo4j.conf` | Konfigurasi cluster bersama |
| `seed/seed.cypher` | Constraint + dataset bersama (6 User, 15 Destination, 5 Category) |
| `queries/recommendation.cypher` | Query 1-7 (rekomendasi, write, populer, visualisasi) |

Folder `data/` dan `logs/` dibuat saat container jalan dan tidak di-commit.

## Menjalankan dari nol (PowerShell, dari folder `neo4j`)

```powershell
# 1. Network bersama (sekali saja per laptop; abaikan error "already exists")
docker network create tripmate-net

# 2. Folder data dan logs
mkdir data\neo4j1, data\neo4j2, data\neo4j3, logs\neo4j1, logs\neo4j2, logs\neo4j3

# 3. Nyalakan cluster, tunggu sampai ketiganya "Started." (1-2 menit)
docker compose up -d
docker compose logs neo4j1 | Select-String "Started"
docker compose logs neo4j2 | Select-String "Started"
docker compose logs neo4j3 | Select-String "Started"

# 4. Buat database tripmate (1 primary + 2 secondary)
docker exec -it neo4j1 cypher-shell -a bolt://localhost:7687 -u neo4j -p tripmate123 -d system "CREATE DATABASE tripmate IF NOT EXISTS TOPOLOGY 1 PRIMARY 2 SECONDARIES WAIT;"
docker exec -it neo4j1 cypher-shell -a bolt://localhost:7687 -u neo4j -p tripmate123 -d system "SHOW DATABASE tripmate YIELD serverID, role, writer, currentStatus;"

# 5. Seed data ke primary
Get-Content .\seed\seed.cypher | docker exec -i neo4j1 cypher-shell -a bolt://localhost:7687 -u neo4j -p tripmate123 -d tripmate
```

Cek di Neo4j Browser (`http://localhost:7474`, connect `bolt://localhost:7687`):

```cypher
USE tripmate
MATCH (n) RETURN labels(n)[0] AS label, count(*) AS jumlah ORDER BY label;
```

Hasil yang benar: 5 Category, 15 Destination, 6 User. Relasi: 15 BELONGS_TO, 12 LIKES, 16 VISITED.

## Catatan Windows: kenapa ada `entrypoint` di docker-compose.yml

Dengan `EXTENDED_CONF=yes`, Neo4j mewajibkan `neo4j.conf` berpermission maksimal 640.
File yang di-mount dari Windows terbaca sebagai 777, dan kalau di-mount ke `/conf`,
script startup Neo4j menyalinnya apa adanya sehingga container gagal start dengan error
`does not have the correct file permissions to evaluate commands`.

Solusinya: `neo4j.conf` di-mount ke `/tripmate`, disalin ke folder conf Neo4j lebih dulu,
lalu script startup asli dijalankan dan mengubah permission-nya menjadi 600.
Nama container, port, network, dan topologi tetap sesuai file konteks.

## Hasil yang diharapkan (user U001)

| Query | Hasil |
| --- | --- |
| 3. Rekomendasi (format Redis) | `["D002","D005","D007","D008","D010"]` |
| 3 setelah query 4 (U001 LIKES `budaya`) | `["D002","D007","D005","D008","D010"]` (D007 skor naik dari 1 ke 2) |
| 6. Populer | skor 2: D001, D002, D004, D007, D010, D013; skor 1: D005, D008, D011, D014 |

Mengembalikan data setelah latihan demo (hapus LIKES `budaya` milik U001):

```cypher
USE tripmate
MATCH (:User {user_id: 'U001'})-[r:LIKES]->(:Category {name: 'budaya'}) DELETE r;
```

## Mematikan dan reset

```powershell
docker compose stop      # matikan, data tetap ada
docker compose start     # nyalakan lagi
docker compose down      # hapus container, data di folder data\ tetap ada
```

Reset total (hapus semua data Neo4j, lalu ulangi "Menjalankan dari nol"):

```powershell
docker compose down
Remove-Item -Recurse -Force data, logs
```
