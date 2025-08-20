// MongoDB initialization script
db = db.getSiblingDB('simshield_iot');

// Create collections
db.createCollection('sims');
db.createCollection('customers');
db.createCollection('iot_plans');
db.createCollection('usage');
db.createCollection('device_profiles');
db.createCollection('add_on_packs');
db.createCollection('actions_log');
db.createCollection('anomalies');

// Create indexes for better performance
db.sims.createIndex({ "sim_id": 1 }, { unique: true });
db.sims.createIndex({ "customer_id": 1 });
db.sims.createIndex({ "status": 1 });
db.sims.createIndex({ "risk_score": 1 });

db.usage.createIndex({ "sim_id": 1, "timestamp": -1 });
db.usage.createIndex({ "timestamp": 1 });

db.customers.createIndex({ "customer_id": 1 }, { unique: true });
db.iot_plans.createIndex({ "plan_id": 1 }, { unique: true });
db.device_profiles.createIndex({ "device_type": 1 }, { unique: true });
db.add_on_packs.createIndex({ "addon_id": 1 }, { unique: true });

db.actions_log.createIndex({ "sim_id": 1 });
db.actions_log.createIndex({ "created_at": -1 });

db.anomalies.createIndex({ "sim_id": 1, "detected_at": -1 });
db.anomalies.createIndex({ "type": 1 });
db.anomalies.createIndex({ "detected_at": -1 });

print('✅ SimShield IoT database initialized successfully');
