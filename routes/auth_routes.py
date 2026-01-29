from flask import Blueprint, request, jsonify, session
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    pin = data.get('pin')
    
    user = User.query.first()
    if user and user.check_pin(pin):
        session['user_id'] = user.id
        return jsonify({'message': 'Logged in successfully'}), 200
    
    return jsonify({'error': 'Invalid PIN'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/change-pin', methods=['POST'])
def change_pin():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    current_pin = data.get('current_pin')
    new_pin = data.get('new_pin')
    
    user = User.query.get(session['user_id'])
    if user and user.check_pin(current_pin):
        if len(new_pin) != 4 or not new_pin.isdigit():
             return jsonify({'error': 'New PIN must be 4 digits'}), 400
             
        user.set_pin(new_pin)
        db.session.commit()
        return jsonify({'message': 'PIN updated successfully'}), 200
    
    return jsonify({'error': 'Invalid current PIN'}), 400

@auth_bp.route('/me', methods=['GET'])
def me():
    if 'user_id' in session:
        return jsonify({'authenticated': True}), 200
    return jsonify({'authenticated': False}), 200
