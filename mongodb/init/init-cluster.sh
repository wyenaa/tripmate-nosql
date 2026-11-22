
#!/usr/bin/env bash
set -euo pipefail

# ==============================================
# TRIPMATE - INISIALISASI CLUSTER MONGODB
# Config Server : cfgRS
# Shard 1       : shard1RS
# Shard 2       : shard2RS
# ==============================================

# Inisialisasi hanya jika belum pernah dilakukan
init_rs() {
  local container="$1"
  local config="$2"

  local state
  state=$(docker exec "$container" mongosh --quiet --eval \
    'try { rs.status().ok === 1 } catch(e) { false }' \
    2>/dev/null || true)

  if [[ "$state" == *true* ]]; then
    echo "$container sudah diinisialisasi. Lewati."
  else
    docker exec "$container" mongosh --quiet --eval "$config"
  fi
}

# Tunggu sampai replica set memiliki PRIMARY
wait_primary() {
  local container="$1"

  for i in {1..30}; do
    local status
    status=$(docker exec "$container" mongosh --quiet --eval \
      'try {
        rs.status().members.some(m => m.stateStr === "PRIMARY")
      } catch(e) { false }' 2>/dev/null || true)

    if [[ "$status" == *true* ]]; then
      echo "$container: PRIMARY tersedia."
      return 0
    fi

    sleep 2
  done

  echo "ERROR: PRIMARY belum tersedia pada $container"
  exit 1
}

echo "=== 1. CONFIG SERVER ==="

init_rs cfg1 '
rs.initiate({
  _id: "cfgRS",
  configsvr: true,
  members: [
    { _id: 0, host: "cfg1:27017" }
  ]
})
'

echo "=== 2. SHARD 1 ==="

init_rs shard1a '
rs.initiate({
  _id: "shard1RS",
  members: [
    { _id: 0, host: "shard1a:27017" },
    { _id: 1, host: "shard1b:27017" },
    { _id: 2, host: "shard1c:27017" }
  ]
})
'

echo "=== 3. SHARD 2 ==="

init_rs shard2a '
rs.initiate({
  _id: "shard2RS",
  members: [
    { _id: 0, host: "shard2a:27017" },
    { _id: 1, host: "shard2b:27017" },
    { _id: 2, host: "shard2c:27017" }
  ]
})
'

echo "=== 4. TUNGGU PRIMARY ==="

wait_primary cfg1
wait_primary shard1a
wait_primary shard2a

echo "=== 5. DAFTARKAN SHARD KE MONGOS ==="

# Tunggu mongos siap menerima koneksi
ready=false

for i in {1..30}; do
  if docker exec mongos mongosh --quiet --eval \
    'db.adminCommand({ping:1}).ok' 2>/dev/null | grep -q '^1$'; then
    ready=true
    break
  fi
  sleep 2
done

if [[ "$ready" != "true" ]]; then
  echo "ERROR: mongos belum siap."
  exit 1
fi

# Cek shard yang sudah terdaftar
for shard in shard1RS shard2RS; do
  exists=$(docker exec mongos mongosh --quiet --eval \
    "db.adminCommand({listShards:1}).shards.some(s => s._id === '$shard')" \
    2>/dev/null || true)

  if [[ "$exists" == *true* ]]; then
    echo "$shard sudah terdaftar. Lewati."
  else
    if [[ "$shard" == "shard1RS" ]]; then
      docker exec mongos mongosh --quiet --eval \
        'sh.addShard("shard1RS/shard1a:27017,shard1b:27017,shard1c:27017")'
    else
      docker exec mongos mongosh --quiet --eval \
        'sh.addShard("shard2RS/shard2a:27017,shard2b:27017,shard2c:27017")'
    fi
  fi
done

echo "=== CLUSTER BERHASIL DIINISIALISASI ==="

docker exec mongos mongosh --quiet --eval 'sh.status()'
