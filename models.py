from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pin_hash = db.Column(db.String(128))

    def set_pin(self, pin):
        self.pin_hash = generate_password_hash(pin)

    def check_pin(self, pin):
        return check_password_hash(self.pin_hash, pin)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(20), nullable=False) # 'income' or 'expense'

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'type': self.type}

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    description = db.Column(db.String(200))
    type = db.Column(db.String(20), nullable=False) # 'income' or 'expense'
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    category = db.relationship('Category', backref=db.backref('transactions', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'amount': self.amount,
            'date': self.date.strftime('%Y-%m-%d'),
            'description': self.description,
            'type': self.type,
            'category_name': self.category.name,
            'category_id': self.category_id
        }
