// TripMate - query Neo4j (Recommendation Service)
// Database: tripmate. Contoh user: U001.
// Jalankan per query (copy satu per satu ke Neo4j Browser), JANGAN sekaligus.
// Query 4 dan 5 mengubah data, jalankan setelah screenshot query 1-3.

// 1. Content-based: destinasi di kategori yang disukai, belum pernah dikunjungi
MATCH (u:User {user_id: 'U001'})-[:LIKES]->(c:Category)<-[:BELONGS_TO]-(d:Destination)
WHERE NOT EXISTS { (u)-[:VISITED]->(d) }
RETURN d.destination_id AS id, d.name AS nama, c.name AS kategori
ORDER BY id;

// 2. Collaborative: dikunjungi user lain yang seleranya mirip
MATCH (u:User {user_id: 'U001'})-[:LIKES]->(:Category)<-[:LIKES]-(other:User)-[:VISITED]->(d:Destination)
WHERE other <> u AND NOT EXISTS { (u)-[:VISITED]->(d) }
RETURN d.destination_id AS id, d.name AS nama, count(DISTINCT other) AS skor
ORDER BY skor DESC, id
LIMIT 5;

// 3. Hasil dalam format cache Redis (JSON array ID)
MATCH (u:User {user_id: 'U001'})-[:LIKES]->(:Category)<-[:LIKES]-(other:User)-[:VISITED]->(d:Destination)
WHERE other <> u AND NOT EXISTS { (u)-[:VISITED]->(d) }
WITH d, count(DISTINCT other) AS skor
ORDER BY skor DESC, d.destination_id
RETURN collect(d.destination_id)[0..5] AS rekomendasi;

// 4. Write: user menyukai kategori baru (jalankan di primary)
MATCH (u:User {user_id: 'U001'}), (c:Category {name: 'budaya'})
MERGE (u)-[:LIKES]->(c);

// 5. Write: user mengunjungi destinasi (setelah trip selesai di MongoDB)
MATCH (u:User {user_id: 'U001'}), (d:Destination {destination_id: 'D005'})
MERGE (u)-[:VISITED]->(d);

// 6. Destinasi paling sering dikunjungi (sumber popular:destinations di Redis)
MATCH (:User)-[:VISITED]->(d:Destination)
RETURN d.destination_id AS id, count(*) AS kunjungan
ORDER BY kunjungan DESC, id;

// 7. Visualisasi graf satu user (untuk screenshot)
MATCH p = (u:User {user_id: 'U001'})-[:LIKES|VISITED]->()
RETURN p;
