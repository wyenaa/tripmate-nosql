# Demo Redis: Cache Layer TripMate (Wyena)

Semua isi Redis adalah **cache**: boleh hilang, selalu bisa dibangun ulang dari MongoDB dan Neo4j.
Topologi: 1 master + 2 replica + 3 Sentinel (quorum 2), tanpa sharding.

---

## A. Menyalakan (Tahap 1)

```bash
docker network create tripmate-net        # sekali per laptop (abaikan error jika sudah ada)
cd redis
docker compose up -d
docker ps                                  # harus ada 6 container Redis
```

Mengulang demo dari nol (state Sentinel dan master lama ikut bersih):
```bash
docker compose down -v
docker compose up -d
```

## B. Verifikasi replikasi (Tahap 2)

```bash
docker exec -it redis-master    redis-cli INFO replication   # role:master, connected_slaves:2
docker exec -it redis-replica-1 redis-cli INFO replication   # role:slave, master_link_status:up
docker exec -it redis-replica-2 redis-cli INFO replication   # role:slave, master_link_status:up
```

## C. Isi data cache (Tahap 3)

Linux/macOS/Git Bash:
```bash
docker exec -i redis-master redis-cli < commands/seed.redis
```
Windows PowerShell:
```powershell
Get-Content commands/seed.redis | docker exec -i redis-master redis-cli
```

Cek hasilnya:
```bash
docker exec -it redis-master redis-cli DBSIZE      # 17 (15 dest + popular + rec:U001)
```

## D. Operasi demo cache (Tahap 4)

Masuk shell: `docker exec -it redis-master redis-cli`

```redis
# Cache hit dan sisa umur cache
GET rec:U001
TTL rec:U001

# Cache miss untuk user yang belum di-cache
GET rec:U002
EXISTS rec:U002

# Detail destinasi
HGETALL dest:D002

# 5 destinasi terpopuler
ZREVRANGE popular:destinations 0 4 WITHSCORES

# Ada kunjungan baru ke D005
ZINCRBY popular:destinations 1 D005

# Invalidasi setelah U001 menambah LIKES di Neo4j
DEL rec:U001
GET rec:U001
```

### Alur cache-aside (untuk dijelaskan, dijalankan manual)
1. `GET rec:U002` -> kosong (**cache miss**)
2. Jalankan query rekomendasi U002 di Neo4j
3. `SET rec:U002 '["D00x","D00y"]' EX 3600`
4. `GET rec:U002` -> langsung dari Redis (**cache hit**)

### Kaitan dengan skenario integrasi (00_KONTEKS_BERSAMA.md bagian 7)
- Langkah 4: `SET rec:U001 '[...]' EX 3600` lalu `GET rec:U001`
- Langkah 6: `DEL rec:U001`, lalu ulangi langkah 2 (Neo4j) dan 4 (Redis) dengan hasil baru

## E. Bukti terdistribusi (Tahap 5)

### E1. Replikasi dan read-only
```bash
# data dari master terbaca di replica
docker exec -it redis-replica-1 redis-cli GET rec:U001
docker exec -it redis-replica-2 redis-cli GET rec:U001

# write di replica ditolak
docker exec -it redis-replica-1 redis-cli SET coba 1
# (error) READONLY You can't write against a read only replica.
```

### E2. Sentinel
```bash
docker exec -it sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
docker exec -it sentinel-1 redis-cli -p 26379 SENTINEL master mymaster      # num-slaves 2, num-other-sentinels 2
docker exec -it sentinel-1 redis-cli -p 26379 SENTINEL replicas mymaster
```

### E3. Failover
```bash
# 1) catat master sekarang (screenshot "sebelum")
docker exec -it sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 2) matikan master
docker stop redis-master

# 3) tunggu 10-15 detik, lalu cek lagi (screenshot "sesudah"): alamat harus berubah
sleep 15
docker exec -it sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 4) cek replica mana yang dipromosikan
docker exec -it redis-replica-1 redis-cli INFO replication | grep -E "role|connected_slaves"
docker exec -it redis-replica-2 redis-cli INFO replication | grep -E "role|connected_slaves"

# 5) data cache masih ada di master baru
docker exec -it redis-replica-1 redis-cli GET rec:U001     # (ganti ke replica yang jadi master)

# 6) nyalakan lagi master lama, tunggu beberapa detik: ia kembali sebagai replica
docker start redis-master
sleep 10
docker exec -it redis-master redis-cli INFO replication | grep -E "role|master_host"     # role:slave
```

Catatan:
- Sentinel bisa menampilkan IP, bukan nama container. Cocokkan dengan `docker network inspect tripmate-net` atau cek `INFO replication` di tiap replica.
- Replikasi Redis asinkron, jadi write terakhir bisa hilang saat failover. Aman karena isinya cache: tinggal dihitung ulang dari Neo4j.

## F. Screenshot untuk laporan (simpan di `laporan/screenshots/`)

| File | Isi | Perintah |
|---|---|---|
| `redis_01_docker-ps.png` | 6 container Redis berjalan | bagian A |
| `redis_02_info-replication-master.png` | `role:master`, `connected_slaves:2` | B |
| `redis_03_baca-di-replica.png` | data master terbaca di replica | E1 |
| `redis_04_readonly.png` | write di replica ditolak | E1 |
| `redis_05_cache-rekomendasi.png` | `SET`/`GET`/`TTL` `rec:U001` | D |
| `redis_06_hash-sortedset.png` | `HGETALL dest:D002` dan `ZREVRANGE popular:destinations` | D |
| `redis_07_invalidasi.png` | `DEL rec:U001` lalu `GET` kosong | D |
| `redis_08_sentinel-sebelum.png` | master sebelum failover | E3 langkah 1 |
| `redis_09_sentinel-sesudah.png` | master baru setelah failover | E3 langkah 3 |

## G. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `network tripmate-net declared as external, but could not be found` | jalankan `docker network create tripmate-net` |
| `connected_slaves:0` | replica belum siap; tunggu beberapa detik, cek `docker logs redis-replica-1` |
| Sentinel tidak mau failover | pastikan 3 Sentinel hidup (`docker ps`); quorum 2 butuh minimal 2 Sentinel; cek `SENTINEL master mymaster` |
| Setelah demo failover, hasil aneh saat diulang | `docker compose down -v` lalu `up -d` supaya state lama bersih |
| `port is already allocated` | port 6379/6380/6381/26379-26381 dipakai proses lain; hentikan atau ganti port host di compose (kabari grup dulu) |
| Redirect `<` tidak jalan di PowerShell | pakai `Get-Content ... \| docker exec -i ...` (bagian C) |

## H. Serah terima (Tahap 6)
- [ ] Naufal: format hasil rekomendasi (JSON array `destination_id`), aturan invalidasi, data `popular:destinations`
- [ ] Dyan: nama, kategori, kota di `dest:{id}` sama dengan `destinations` di MongoDB
- [ ] Lidya: 9 screenshot di atas, desain key, alasan replikasi + Sentinel tanpa sharding