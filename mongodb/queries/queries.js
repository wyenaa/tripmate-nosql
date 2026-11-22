// =====================================================
// TRIPMATE - QUERY DEMO MONGODB
// File: mongodb/queries/queries.js
// Database: tripmate
// =====================================================

const tm = db.getSiblingDB("tripmate");

function section(title) {
  print("\n========================================");
  print(title);
  print("========================================");
}

// =====================================================
// QUERY 1 - TARGETED QUERY
// Semua trip milik U001
// =====================================================

section("QUERY 1 - TRIP MILIK U001");

printjson(tm.trips.find({ user_id: "U001" }).toArray());

// =====================================================
// QUERY 2 - SCATTER-GATHER
// Trip di mana U005 menjadi anggota
// =====================================================

section("QUERY 2 - TRIP ANGGOTA U005");

printjson(tm.trips.find({ members: "U005" }).toArray());

// =====================================================
// QUERY 6 - AGGREGATION VISITED
// Dijalankan sebelum update T011
// =====================================================

section("QUERY 6 - VISITED UNTUK NEO4J");

printjson(
  tm.trips
    .aggregate([
      { $match: { status: "selesai" } },
      { $unwind: "$members" },
      { $unwind: "$days" },
      { $unwind: "$days.activities" },
      {
        $group: {
          _id: "$members",
          visited: {
            $addToSet: "$days.activities.destination_id",
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray(),
);

// =====================================================
// QUERY 3 - UPDATE NESTED ARRAY
// Menambah activity pada hari pertama trip T011
// =====================================================

section("QUERY 3 - UPDATE NESTED ARRAY T011");

// Periksa agar activity tidak ditambahkan dua kali
const existingActivity = tm.trips.findOne({
  _id: "T011",
  user_id: "U001",
  days: {
    $elemMatch: {
      day: 1,
      activities: {
        $elemMatch: {
          order: 2,
          time: "02:00",
          destination_id: "D005",
          title: "Pendakian blue fire",
        },
      },
    },
  },
});

if (!existingActivity) {
  printjson(
    tm.trips.updateOne(
      { _id: "T011", user_id: "U001" },
      {
        $push: {
          "days.$[d].activities": {
            order: 2,
            time: "02:00",
            destination_id: "D005",
            title: "Pendakian blue fire",
          },
        },
      },
      {
        arrayFilters: [{ "d.day": 1 }],
      },
    ),
  );
} else {
  print("Activity sudah ada. UPDATE dilewati.");
}

// Menampilkan nested array setelah update
printjson(tm.trips.findOne({ _id: "T011" }, { _id: 1, days: 1 }));

// =====================================================
// QUERY 4 - UPDATE STATUS TRIP
// Mengubah T011 dari direncanakan menjadi berjalan
// =====================================================

section("QUERY 4 - UPDATE STATUS T011");

const currentTrip = tm.trips.findOne({
  _id: "T011",
  user_id: "U001",
});

if (currentTrip && currentTrip.status === "direncanakan") {
  printjson(tm.trips.updateOne({ _id: "T011", user_id: "U001" }, { $set: { status: "berjalan" } }));
} else {
  print("Status sudah berubah atau trip tidak ditemukan.");
}

printjson(tm.trips.findOne({ _id: "T011" }, { _id: 1, status: 1 }));

// =====================================================
// QUERY 5 - AGGREGATION JUMLAH TRIP PER STATUS
// =====================================================

section("QUERY 5 - JUMLAH TRIP PER STATUS");

printjson(
  tm.trips
    .aggregate([
      {
        $group: {
          _id: "$status",
          jumlah: { $sum: 1 },
        },
      },
    ])
    .toArray(),
);

// =====================================================
// QUERY 7 - DETAIL DESTINASI REKOMENDASI
// =====================================================

section("QUERY 7 - DETAIL DESTINASI");

printjson(
  tm.destinations
    .find({
      _id: {
        $in: ["D002", "D005", "D007", "D008", "D010"],
      },
    })
    .toArray(),
);

// =====================================================
// QUERY 8 - BOOKING BERDASARKAN TRIP
// =====================================================

section("QUERY 8 - BOOKING T003");

printjson(
  tm.bookings
    .find({
      trip_id: "T003",
    })
    .toArray(),
);

// =====================================================
// QUERY 9 - READ DARI SECONDARY
// =====================================================

section("QUERY 9 - SECONDARY READ");

tm.getMongo().setReadPref("secondary");

print("Read preference:");
printjson(tm.getMongo().getReadPref());

print("Query execution plan:");
printjson(tm.trips.find({ user_id: "U001" }).explain("queryPlanner"));

// Mengembalikan preferensi ke PRIMARY
tm.getMongo().setReadPref("primary");

// =====================================================
// BUKTI TARGETED VS SCATTER-GATHER
// =====================================================

section("EXPLAIN - TARGETED QUERY");

const targeted = tm.trips
  .find({
    user_id: "U001",
  })
  .explain("queryPlanner");

printjson({
  stage: targeted.queryPlanner.winningPlan.stage,
  shards: targeted.queryPlanner.winningPlan.shards.map((s) => s.shardName),
});

section("EXPLAIN - SCATTER-GATHER");

const scatter = tm.trips
  .find({
    members: "U005",
  })
  .explain("queryPlanner");

printjson({
  stage: scatter.queryPlanner.winningPlan.stage,
  shards: scatter.queryPlanner.winningPlan.shards.map((s) => s.shardName),
});

print("\nSEMUA QUERY DEMO SELESAI");
