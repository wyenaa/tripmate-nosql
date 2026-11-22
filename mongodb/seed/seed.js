// ====================================================
// TRIPMATE - MONGODB PLANNING SERVICE
// File: mongodb/seed/seed.js
// Sumber: 00_KONTEKS_BERSAMA.md
// Jalankan melalui mongos
// ====================================================

const tm = db.getSiblingDB("tripmate");

// Cegah duplikasi data apabila seed dijalankan ulang
for (const coll of ["destinations", "trips", "bookings"]) {
  if (tm.getCollection(coll).countDocuments({}) > 0) {
    throw new Error(`Collection ${coll} sudah berisi data. Seed dihentikan.`);
  }
}

// ====================================================
// 1. COLLECTION DESTINATIONS (15 DOKUMEN)
// ====================================================

const destinationRows = [
  ["D001", "Pantai Kuta", "Badung", "Bali", "pantai"],
  ["D002", "Pantai Parangtritis", "Bantul", "DI Yogyakarta", "pantai"],
  ["D003", "Pantai Balekambang", "Malang", "Jawa Timur", "pantai"],
  ["D004", "Gunung Bromo", "Probolinggo", "Jawa Timur", "gunung"],
  ["D005", "Kawah Ijen", "Banyuwangi", "Jawa Timur", "gunung"],
  ["D006", "Gunung Prau", "Wonosobo", "Jawa Tengah", "gunung"],
  ["D007", "Candi Borobudur", "Magelang", "Jawa Tengah", "budaya"],
  ["D008", "Candi Prambanan", "Sleman", "DI Yogyakarta", "budaya"],
  ["D009", "Keraton Yogyakarta", "Yogyakarta", "DI Yogyakarta", "budaya"],
  ["D010", "Coban Rondo", "Malang", "Jawa Timur", "alam"],
  ["D011", "Kebun Raya Bogor", "Bogor", "Jawa Barat", "alam"],
  ["D012", "Danau Toba", "Samosir", "Sumatera Utara", "alam"],
  ["D013", "Jatim Park 2", "Batu", "Jawa Timur", "rekreasi"],
  ["D014", "Dunia Fantasi", "Jakarta Utara", "DKI Jakarta", "rekreasi"],
  ["D015", "Museum Angkut", "Batu", "Jawa Timur", "rekreasi"],
];

const destinations = destinationRows.map(([id, name, city, province, category]) => ({
  _id: id,
  name,
  category,
  location: {
    city,
    province,
  },
}));

// Contoh atribut fleksibel sesuai file tugas MongoDB
destinations.find((d) => d._id === "D002").attributes = {
  aktivitas: ["sunset", "ATV"],
  tiket_masuk: 10000,
};

// ====================================================
// 2. COLLECTION TRIPS (11 DOKUMEN)
// ====================================================

// Helper membuat activity
function activity(order, time, destination_id, title) {
  return {
    order,
    time,
    destination_id,
    title,
  };
}

// Helper membuat hari perjalanan
function day(number, date, activities) {
  return {
    day: number,
    date,
    activities,
  };
}

// Helper membuat dokumen trip
function trip(id, user_id, members, title, status, dates, days, created_at) {
  return {
    _id: id,
    user_id,
    members,
    title,
    is_group: members.length > 1,
    status,
    start_date: dates[0],
    end_date: dates[1],
    days,
    created_at,
  };
}

const trips = [
  // T001 - U001
  trip("T001", "U001", ["U001"], "Liburan Bali", "selesai", ["2026-04-10", "2026-04-10"], [day(1, "2026-04-10", [activity(1, "09:00", "D001", "Menikmati Pantai Kuta")])], "2026-03-20"),

  // T002 - U001
  trip("T002", "U001", ["U001"], "Sunrise Bromo", "selesai", ["2026-05-12", "2026-05-12"], [day(1, "2026-05-12", [activity(1, "04:00", "D004", "Melihat sunrise Bromo")])], "2026-05-01"),

  // T003 - U002 dan U005 (GROUP)
  trip(
    "T003",
    "U002",
    ["U002", "U005"],
    "Jogja Pantai",
    "selesai",
    ["2026-06-10", "2026-06-11"],
    [day(1, "2026-06-10", [activity(1, "15:00", "D002", "Main ATV di Parangtritis"), activity(2, "17:30", "D002", "Menunggu sunset")])],
    "2026-05-20",
  ),

  // T004 - U002
  trip(
    "T004",
    "U002",
    ["U002"],
    "Bali dan Malang",
    "selesai",
    ["2026-07-01", "2026-07-02"],
    [day(1, "2026-07-01", [activity(1, "10:00", "D001", "Berwisata di Pantai Kuta")]), day(2, "2026-07-02", [activity(1, "09:00", "D010", "Menikmati Coban Rondo")])],
    "2026-06-15",
  ),

  // T005 - U003
  trip(
    "T005",
    "U003",
    ["U003"],
    "Magelang ke Batu",
    "selesai",
    ["2026-07-10", "2026-07-11"],
    [day(1, "2026-07-10", [activity(1, "09:00", "D007", "Mengunjungi Candi Borobudur")]), day(2, "2026-07-11", [activity(1, "10:00", "D013", "Bermain di Jatim Park 2")])],
    "2026-06-20",
  ),

  // T006 - U004
  trip(
    "T006",
    "U004",
    ["U004"],
    "Jelajah Jawa Timur",
    "selesai",
    ["2026-08-02", "2026-08-03"],
    [day(1, "2026-08-02", [activity(1, "04:00", "D004", "Sunrise Gunung Bromo")]), day(2, "2026-08-03", [activity(1, "02:00", "D005", "Melihat blue fire Ijen")])],
    "2026-07-10",
  ),

  // T007 - U004
  trip("T007", "U004", ["U004"], "Weekend Bogor", "selesai", ["2026-08-15", "2026-08-15"], [day(1, "2026-08-15", [activity(1, "10:00", "D011", "Jalan di Kebun Raya Bogor")])], "2026-08-01"),

  // T008 - U005
  trip(
    "T008",
    "U005",
    ["U005"],
    "Wisata Candi",
    "selesai",
    ["2026-09-01", "2026-09-02"],
    [day(1, "2026-09-01", [activity(1, "09:00", "D007", "Wisata Candi Borobudur")]), day(2, "2026-09-02", [activity(1, "09:00", "D008", "Wisata Candi Prambanan")])],
    "2026-08-15",
  ),

  // T009 - U006
  trip(
    "T009",
    "U006",
    ["U006"],
    "Batu dan Malang",
    "selesai",
    ["2026-09-10", "2026-09-11"],
    [day(1, "2026-09-10", [activity(1, "09:00", "D010", "Mengunjungi Coban Rondo")]), day(2, "2026-09-11", [activity(1, "10:00", "D013", "Bermain di Jatim Park 2")])],
    "2026-08-20",
  ),

  // T010 - U006
  trip("T010", "U006", ["U006"], "Jakarta Seru", "selesai", ["2026-10-05", "2026-10-05"], [day(1, "2026-10-05", [activity(1, "09:00", "D014", "Bermain di Dunia Fantasi")])], "2026-09-10"),

  // T011 - U001 dan U004 (GROUP, BELUM SELESAI)
  trip("T011", "U001", ["U001", "U004"], "Rencana Kawah Ijen", "direncanakan", ["2026-12-01", "2026-12-02"], [day(1, "2026-12-01", [activity(1, "01:00", "D005", "Persiapan pendakian Ijen")])], "2026-11-01"),
];

// ====================================================
// 3. COLLECTION BOOKINGS (11 DOKUMEN)
// ====================================================

const bookingTypes = ["transport", "transport", "hotel", "hotel", "transport", "transport", "hotel", "transport", "hotel", "transport", "transport"];

const bookingProviders = [
  "Transport Bali",
  "Transport Bromo",
  "Hotel di Parangtritis",
  "Hotel Wisata Malang",
  "Transport Magelang-Batu",
  "Transport Jawa Timur",
  "Hotel Bogor",
  "Transport Wisata Candi",
  "Hotel Batu",
  "Transport Jakarta",
  "Transport Ijen",
];

const bookingPrices = [250000, 200000, 450000, 400000, 300000, 350000, 375000, 225000, 400000, 325000, 200000];

const bookings = trips.map((t, i) => ({
  _id: `B${String(i + 1).padStart(3, "0")}`,
  trip_id: t._id,
  user_id: t.user_id,
  type: bookingTypes[i],
  provider: bookingProviders[i],
  booking_code: `TRP-${String(i + 1).padStart(4, "0")}`,
  date: t.start_date,
  price: bookingPrices[i],
  status: i === 10 ? "pending" : "confirmed",
}));

// ====================================================
// 4. VALIDASI DATASET SEBELUM INSERT
// ====================================================

// VISITED yang wajib sesuai dengan dataset bersama
const expectedVisited = {
  U001: ["D001", "D004"],
  U002: ["D001", "D002", "D010"],
  U003: ["D007", "D013"],
  U004: ["D004", "D005", "D011"],
  U005: ["D002", "D007", "D008"],
  U006: ["D010", "D013", "D014"],
};

const actualVisited = {};

// Hanya trip selesai yang dihitung sebagai VISITED
for (const t of trips.filter((t) => t.status === "selesai")) {
  for (const user of t.members) {
    const visited = actualVisited[user] || (actualVisited[user] = new Set());

    for (const d of t.days) {
      for (const a of d.activities) {
        visited.add(a.destination_id);
      }
    }
  }
}

// Bandingkan VISITED aktual dengan kesepakatan
for (const [user, expected] of Object.entries(expectedVisited)) {
  const actual = [...(actualVisited[user] || new Set())].sort();

  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(`VISITED tidak cocok untuk ${user}`);
  }
}

// Validasi booking harus dimiliki pemilik trip
for (const b of bookings) {
  const t = trips.find((t) => t._id === b.trip_id);

  if (!t || b.user_id !== t.user_id) {
    throw new Error(`Booking ${b._id} tidak sesuai pemilik trip`);
  }
}

print("Validasi VISITED dan booking: OK");

// ====================================================
// 5. INSERT DATA
// ====================================================

print("Memasukkan data destinations...");
tm.destinations.insertMany(destinations);

print("Memasukkan data trips...");
tm.trips.insertMany(trips);

print("Memasukkan data bookings...");
tm.bookings.insertMany(bookings);

// ====================================================
// 6. MEMBUAT INDEX
// ====================================================

tm.trips.createIndex({ members: 1 });
tm.trips.createIndex({ status: 1 });
tm.bookings.createIndex({ trip_id: 1 });
tm.destinations.createIndex({ category: 1 });

// ====================================================
// 7. VERIFIKASI
// ====================================================

print("Jumlah dokumen:");
printjson({
  destinations: tm.destinations.countDocuments({}),
  trips: tm.trips.countDocuments({}),
  bookings: tm.bookings.countDocuments({}),
});

print("VISITED untuk Neo4j:");

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

print("SEED TRIPMATE SELESAI!");
