import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.crud import get_user_by_email, create_user, create_stop, create_route, create_bus, create_trip
from app.schemas import UserCreate, UserRole, StopCreate, RouteCreate, BusCreate, TripCreate
from app.models.trip import TripStatus

def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Automatic migration check for SQLite dev database missing preferred_stop columns
    with engine.connect() as conn:
        for col_def in [
            "ALTER TABLE users ADD COLUMN preferred_stop_id INTEGER;",
            "ALTER TABLE users ADD COLUMN preferred_stop_name VARCHAR;",
            "ALTER TABLE users ADD COLUMN preferred_lat FLOAT;",
            "ALTER TABLE users ADD COLUMN preferred_lng FLOAT;"
        ]:
            try:
                conn.execute(text(col_def))
                conn.commit()
            except Exception:
                pass  # Column already exists

    # 1. Create Default Users if not exist
    users_to_create = [
        UserCreate(email="student@campus.edu", password="password123", role=UserRole.STUDENT, full_name="Alex Johnson", student_id="STU98721"),
        UserCreate(email="driver@campus.edu", password="password123", role=UserRole.DRIVER, full_name="Marcus Vance", driver_license="DL-88219"),
        UserCreate(email="staff@campus.edu", password="password123", role=UserRole.STAFF, full_name="Dr. Sarah Jenkins"),
        UserCreate(email="admin@campus.edu", password="password123", role=UserRole.ADMIN, full_name="System Administrator"),
    ]

    created_users = {}
    for u in users_to_create:
        existing = get_user_by_email(db, u.email)
        if not existing:
            existing = create_user(db, u)
        created_users[u.role] = existing

    # 2. Check if routes/buses already seeded
    from app.crud import get_routes, get_buses
    existing_buses = get_buses(db)
    if existing_buses and len(existing_buses) > 0:
        print("Database already contains seeded routes & buses. Skipping seeder.")
        return

    # 3. Create Stops if none exist
    stops_data = [
        StopCreate(name="Villupuram Main Bus Stand", latitude=11.9392, longitude=79.4975),
        StopCreate(name="Koliyanur Junction Stop", latitude=11.9285, longitude=79.5450),
        StopCreate(name="Valavanur Bus Stop", latitude=11.9215, longitude=79.5850),
        StopCreate(name="IFET Main Entrance Gate", latitude=11.9207, longitude=79.6095),
        StopCreate(name="IFET Main Campus & Auditorium (Destination)", latitude=11.9207389, longitude=79.6107319),
    ]

    created_stops = []
    for s in stops_data:
        stop = create_stop(db, s)
        created_stops.append(stop)

    # 3. Create Routes
    r1 = create_route(db, RouteCreate(
        name="IFET Express Campus Loop",
        start_location="Villupuram Main Bus Stand",
        end_location="IFET Main Campus & Auditorium",
        stop_ids=[created_stops[0].id, created_stops[1].id, created_stops[2].id, created_stops[3].id, created_stops[4].id]
    ))

    r2 = create_route(db, RouteCreate(
        name="Valavanur Shuttle Loop",
        start_location="Valavanur Bus Stop",
        end_location="IFET Main Campus & Auditorium",
        stop_ids=[created_stops[2].id, created_stops[3].id, created_stops[4].id]
    ))


    # 4. Create Buses
    driver = created_users[UserRole.DRIVER]
    b1 = create_bus(db, BusCreate(
        registration_number="BUS-101",
        capacity=45,
        driver_id=driver.id,
        route_id=r1.id,
        is_active=True
    ))

    b2 = create_bus(db, BusCreate(
        registration_number="BUS-102",
        capacity=40,
        driver_id=driver.id,
        route_id=r2.id,
        is_active=True
    ))

    # 5. Create Active Trip
    create_trip(db, TripCreate(
        bus_id=b1.id,
        driver_id=driver.id,
        route_id=r1.id
    ))

    # 6. Create Default Alerts
    from app.crud import create_alert
    from app.schemas import AlertCreate, AlertCategory
    alerts = [
        AlertCreate(title="Blue Express Loop On-Time", message="Blue Express Loop (#101) is operating on regular schedule.", category=AlertCategory.GENERAL),
        AlertCreate(title="Heavy Traffic near Library", message="Expect 3-5 mins minor delay around Central Library due to campus event.", category=AlertCategory.DELAY),
        AlertCreate(title="Bus Stop Maintenance", message="South Quad stop shelter under maintenance. Temporary pickup at Gate 4.", category=AlertCategory.MAINTENANCE)
    ]
    for a in alerts:
        create_alert(db, a)

    print("Database seeding completed successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
