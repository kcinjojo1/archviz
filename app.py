from flask import Flask, render_template, url_for, request, redirect, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail, Message
from wtforms import Form, StringField, PasswordField, validators
import re
import os
from dotenv import load_dotenv
from sqlalchemy.exc import OperationalError
from sqlalchemy.dialects.postgresql import ARRAY
from datetime import datetime
import uuid
import barcode
from barcode.writer import ImageWriter
from pathlib import Path

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True}
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
mail = Mail(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)

    def __repr__(self):
        return f"User('{self.name}', '{self.email}')"

# Business Model
class Business(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location_type = db.Column(db.String(50), nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    modes_of_payment = db.Column(ARRAY(db.String), nullable=False)

    def __repr__(self):
        return f"Business('{self.name}', '{self.location_type}')"

# Coupon Model
class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('business.id'), nullable=False)
    code = db.Column(db.String(100), unique=True, nullable=False)
    barcode_path = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"Coupon('{self.code}', user_id={self.user_id}, business_id={self.business_id})"

# Registration Form
class RegistrationForm(Form):
    name = StringField('Name', [validators.Length(min=1, max=100)])
    email = StringField('Email', [
        validators.Length(min=6, max=120),
        validators.Email(),
        validators.DataRequired()
    ])
    password = StringField('Password', [
        validators.Length(min=6),
        validators.DataRequired(),
        validators.EqualTo('confirm', message='Passwords must match')
    ])
    confirm = PasswordField('Confirm Password')

# Login Form
class LoginForm(Form):
    email = StringField('Email', [
        validators.Length(min=6, max=120),
        validators.Email(),
        validators.DataRequired()
    ])
    password = PasswordField('Password', [validators.DataRequired()])

# Email validation function
def is_valid_email(email):
    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(email_pattern, email) is not None

@app.route("/")
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route("/dashboard")
def dashboard():
    if 'user_id' not in session:
        flash('Please log in to access the dashboard', 'warning')
        return redirect(url_for('login'))
    
    image_urls = {
        "DJI_0633": url_for('static', filename='images/DJI_0633.JPG'),
        "img": url_for('static', filename='images/img.jpg'),
        "img2": url_for('static', filename='images/img2.jpg'),
        "fort_york": url_for('static', filename='images/fort_york.jpg'),
        "cn_tower_pdf": url_for('static', filename='docs/CN_Tower.pdf'),
        "background_image": url_for('static', filename='images/background_image.jpg'),
        "DJI_0639": url_for('static', filename='images/DJI_0639.JPG'),
    }
    return render_template("index.html", image_urls=image_urls)

@app.route("/register", methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    form = RegistrationForm(request.form)
    if request.method == 'POST' and form.validate():
        name = form.name.data
        email = form.email.data
        password = form.password.data

        if not is_valid_email(email):
            flash('Invalid email address', 'error')
            return render_template('register.html', form=form)

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered', 'error')
            return render_template('register.html', form=form)

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(name=name, email=email, password=hashed_password)
        db.session.add(user)
        try:
            db.session.commit()
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except OperationalError as e:
            db.session.rollback()
            flash(f'Database error occurred: {str(e)}', 'error')
            return render_template('register.html', form=form)

    return render_template('register.html', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    form = LoginForm(request.form)
    if request.method == 'POST' and form.validate():
        email = form.email.data
        password = form.password.data

        user = User.query.filter_by(email=email).first()
        if user and bcrypt.check_password_hash(user.password, password):
            session['user_id'] = user.id
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')

    return render_template('login.html', form=form)

@app.route("/logout")
def logout():
    session.pop('user_id', None)
    flash('You have been logged out', 'success')
    return redirect(url_for('login'))

@app.route("/api/businesses", methods=['GET'])
def get_businesses():
    payment_mode = request.args.get('paymentMode')
    try:
        query = Business.query
        if payment_mode:
            query = query.filter(Business.modes_of_payment.contains([payment_mode]))
        businesses = query.all()
        business_list = [
            {
                "id": business.id,
                "name": business.name,
                "location": {
                    "type": business.location_type,
                    "coordinates": [business.longitude, business.latitude]
                },
                "modes_of_payment": business.modes_of_payment
            }
            for business in businesses
        ]
        return jsonify({"businesses": business_list})
    except OperationalError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route("/api/coupons/generate", methods=['POST'])
def generate_coupon():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized, please log in"}), 401
    
    data = request.get_json()
    business_id = data.get('business_id')
    
    if not business_id:
        return jsonify({"error": "Business ID is required"}), 400
    
    business = Business.query.get(business_id)
    if not business:
        return jsonify({"error": "Business not found"}), 404
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    try:
        # Generate unique coupon code
        code = f"COUPON-{uuid.uuid4().hex[:8].upper()}"
        
        # Generate barcode
        barcode_dir = Path('static/barcodes')
        barcode_dir.mkdir(exist_ok=True)
        barcode_path = barcode_dir / f"{code}"
        
        barcode_class = barcode.get_barcode_class('code128')
        barcode_instance = barcode_class(code, writer=ImageWriter())
        barcode_instance.save(barcode_path, options={"write_text": False})
        
        # Save coupon to database
        coupon = Coupon(
            user_id=user.id,
            business_id=business_id,
            code=code,
            barcode_path=f"/static/barcodes/{code}.png"
        )
        db.session.add(coupon)
        db.session.commit()
        
        # Send email notification
        try:
            msg = Message(
                subject=f"Your Exclusive Coupon is Ready, {user.name}!",
                recipients=[user.email],
                body=f"""
                Hi {user.name},

                Thanks for exploring the city with us! Your exclusive drone tour coupon is ready.

                Valid for: 24 hours from now
                Location: {business.name}

                🔗 View Barcode: http://localhost:5000{url_for('static', filename=f'barcodes/{code}.png')}

                Enjoy!
                """
            )
            mail.send(msg)
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500
        
        return jsonify({
            "message": "Coupon generated successfully",
            "coupon": {
                "code": code,
                "barcode_url": url_for('static', filename=f'barcodes/{code}.png', _external=True),
                "business_name": business.name
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to generate coupon: {str(e)}"}), 500

if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except OperationalError as e:
            print(f"Error creating database tables: {e}")
    app.run(debug=True)
