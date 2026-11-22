// TripMate - seed data Neo4j (Recommendation Service)
// Jalankan di neo4j1 (primary), database tripmate.
// Dataset mengikuti 00_KONTEKS_BERSAMA.md bagian 6.

// Constraint
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT destination_id_unique IF NOT EXISTS FOR (d:Destination) REQUIRE d.destination_id IS UNIQUE;
CREATE CONSTRAINT category_name_unique IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE;

// Destinasi + kategori
UNWIND [
  {id:'D001', name:'Pantai Kuta',         category:'pantai'},
  {id:'D002', name:'Pantai Parangtritis', category:'pantai'},
  {id:'D003', name:'Pantai Balekambang',  category:'pantai'},
  {id:'D004', name:'Gunung Bromo',        category:'gunung'},
  {id:'D005', name:'Kawah Ijen',          category:'gunung'},
  {id:'D006', name:'Gunung Prau',         category:'gunung'},
  {id:'D007', name:'Candi Borobudur',     category:'budaya'},
  {id:'D008', name:'Candi Prambanan',     category:'budaya'},
  {id:'D009', name:'Keraton Yogyakarta',  category:'budaya'},
  {id:'D010', name:'Coban Rondo',         category:'alam'},
  {id:'D011', name:'Kebun Raya Bogor',    category:'alam'},
  {id:'D012', name:'Danau Toba',          category:'alam'},
  {id:'D013', name:'Jatim Park 2',        category:'rekreasi'},
  {id:'D014', name:'Dunia Fantasi',       category:'rekreasi'},
  {id:'D015', name:'Museum Angkut',       category:'rekreasi'}
] AS row
MERGE (d:Destination {destination_id: row.id})
SET d.name = row.name
MERGE (c:Category {name: row.category})
MERGE (d)-[:BELONGS_TO]->(c);

// User + LIKES + VISITED
UNWIND [
  {id:'U001', name:'Andi',  likes:['pantai','gunung'],    visited:['D001','D004']},
  {id:'U002', name:'Budi',  likes:['pantai','alam'],      visited:['D001','D002','D010']},
  {id:'U003', name:'Citra', likes:['budaya','rekreasi'],  visited:['D007','D013']},
  {id:'U004', name:'Dewi',  likes:['gunung','alam'],      visited:['D004','D005','D011']},
  {id:'U005', name:'Eka',   likes:['pantai','budaya'],    visited:['D002','D007','D008']},
  {id:'U006', name:'Fajar', likes:['rekreasi','alam'],    visited:['D010','D013','D014']}
] AS row
MERGE (u:User {user_id: row.id})
SET u.name = row.name
WITH u, row
CALL (u, row) {
  UNWIND row.likes AS cat
  MATCH (c:Category {name: cat})
  MERGE (u)-[:LIKES]->(c)
}
CALL (u, row) {
  UNWIND row.visited AS did
  MATCH (d:Destination {destination_id: did})
  MERGE (u)-[:VISITED]->(d)
};
