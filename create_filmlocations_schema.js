// Create DB schema and table to hold film locations data.
// Usage: mongo create_filmlocations_schema.js
db = db.getSiblingDB('filmlocations');
db.createCollection("filmlocations");
