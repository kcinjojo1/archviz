from app import app, db, Business

def seed_businesses():
         with app.app_context():
             # Clear existing businesses (optional, for clean seeding)
             db.session.query(Business).delete()
             db.session.commit()

             # Sample business data
             businesses = [
                 {
                     "name": "RippleRoot Cafe",
                     "location_type": "Food",
                     "longitude": -79.3880,
                     "latitude": 43.6435,
                     "modes_of_payment": ["cash", "credit_card", "rippleroot"]
                 },
                 {
                     "name": "Tech Hub Downtown",
                     "location_type": "Garments",
                     "longitude": -79.3850,
                     "latitude": 43.6448,
                     "modes_of_payment": ["credit_card", "rippleroot"]
                 },
                 {
                     "name": "Green Office Space",
                     "location_type": "Food",
                     "longitude": -79.3890,
                     "latitude": 43.6410,
                     "modes_of_payment": ["cash", "rippleroot"]
                 }
             ]

             for business in businesses:
                 db.session.add(Business(
                     name=business["name"],
                     location_type=business["location_type"],
                     longitude=business["longitude"],
                     latitude=business["latitude"],
                     modes_of_payment=business["modes_of_payment"]
                 ))
             db.session.commit()
             print("Businesses seeded successfully")

if __name__ == "__main__":
         seed_businesses()