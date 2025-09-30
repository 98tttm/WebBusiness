from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
db = SQLAlchemy()

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    products = db.relationship('Product', backref='category', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(200), index=True)  # id gốc nếu có
    name = db.Column(db.String(500), nullable=False)
    slug = db.Column(db.String(500), unique=True, nullable=False)
    brand = db.Column(db.String(200))
    price = db.Column(db.Float)
    old_price = db.Column(db.Float)
    unit = db.Column(db.String(50))
    stock = db.Column(db.Integer, default=0)
    description = db.Column(db.Text)
    images = db.Column(db.Text)  # lưu JSON list của urls/paths
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
