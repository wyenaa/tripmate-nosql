// =============================================
// TRIPMATE - KONFIGURASI SHARDING
// Database : tripmate
// Shard key: { user_id: "hashed" }
// =============================================

// 1. Aktifkan sharding database
sh.enableSharding("tripmate");

// 2. Aktifkan sharding collection trips
sh.shardCollection("tripmate.trips", { user_id: "hashed" });

// 3. Aktifkan sharding collection bookings
sh.shardCollection("tripmate.bookings", { user_id: "hashed" });

// Collection destinations tidak di-shard
// karena berisi data kecil dan relatif stabil.

// 4. Tampilkan hasil konfigurasi
sh.status();
