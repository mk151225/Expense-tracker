from flask import Flask, render_template, session, make_response
from models import db, User, Category
from routes.auth_routes import auth_bp
from routes.data_routes import data_bp
import os
import secrets

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = secrets.token_hex(16)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expense_track.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(data_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return render_template('index.html')

    with app.app_context():
        db.create_all()
        # Create default user if not exists
        if not User.query.first():
            default_user = User()
            default_user.set_pin('1234')
            db.session.add(default_user)
            db.session.commit()
            print("Default user created with PIN 1234")
        
        # Create default categories if not exist
        if not Category.query.first():
            default_categories = [
                Category(name='Salary', type='income'),
                Category(name='Freelance', type='income'),
                Category(name='Food', type='expense'),
                Category(name='Rent', type='expense'),
                Category(name='Transport', type='expense'),
                Category(name='Entertainment', type='expense')
            ]
            db.session.add_all(default_categories)
            db.session.commit()
            print("Default categories created")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
