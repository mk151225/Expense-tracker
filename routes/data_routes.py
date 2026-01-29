from flask import Blueprint, request, jsonify, session
from models import db, Category, Transaction
from datetime import datetime, timedelta
from sqlalchemy import func

data_bp = Blueprint('data', __name__)

def is_authenticated():
    return 'user_id' in session

@data_bp.route('/categories', methods=['GET', 'POST', 'DELETE'])
def categories():
    if not is_authenticated():
        return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'GET':
        categories = Category.query.all()
        return jsonify([c.to_dict() for c in categories])
    
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        type = data.get('type')
        if not name or type not in ['income', 'expense']:
            return jsonify({'error': 'Invalid data'}), 400
        
        new_category = Category(name=name, type=type)
        db.session.add(new_category)
        db.session.commit()
        return jsonify(new_category.to_dict()), 201

    if request.method == 'DELETE':
        cat_id = request.args.get('id')
        category = Category.query.get(cat_id)
        if category:
            # Handle dependent transactions? For now, let's keep it simple or set null
            # Ideally we check if used.
            db.session.delete(category)
            db.session.commit()
            db.session.delete(category)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Deleted'}), 200
        return jsonify({'error': 'Category not found'}), 404

@data_bp.route('/transactions', methods=['GET', 'POST', 'DELETE'])
def transactions():
    if not is_authenticated():
        return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'GET':
        query = Transaction.query
        
        # Filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        t_type = request.args.get('type')

        if start_date:
            query = query.filter(Transaction.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        if end_date:
            query = query.filter(Transaction.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        if t_type:
            query = query.filter(Transaction.type == t_type)
            
        transactions = query.order_by(Transaction.date.desc(), Transaction.id.desc()).all()
        return jsonify([t.to_dict() for t in transactions])

    if request.method == 'POST':
        data = request.get_json()
        print(f"DEBUG: Received transaction data: {data}")
        try:
            if not data.get('category_id'):
                 raise ValueError("Category is required")
            
            amount = float(data.get('amount'))
            date_str = data.get('date') # YYYY-MM-DD
            description = data.get('description', '')
            t_type = data.get('type')
            category_id = int(data.get('category_id'))
            
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            new_transaction = Transaction(
                amount=amount,
                date=date_obj,
                description=description,
                type=t_type,
                category_id=category_id
            )
            db.session.add(new_transaction)
            db.session.commit()
            return jsonify(new_transaction.to_dict()), 201
        except Exception as e:
            print(f"ERROR adding transaction: {e}")
            return jsonify({'error': str(e)}), 400

    if request.method == 'DELETE':
        t_id = request.args.get('id')
        transaction = Transaction.query.get(t_id)
        if transaction:

            db.session.delete(transaction)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Deleted'}), 200
        return jsonify({'error': 'Transaction not found'}), 404

@data_bp.route('/dashboard', methods=['GET'])
def dashboard():
    if not is_authenticated():
        return jsonify({'error': 'Unauthorized'}), 401

    period = request.args.get('period', 'monthly') # daily, weekly, monthly
    
    now = datetime.now().date()
    if period == 'daily':
        start_date = now
    elif period == 'weekly':
        start_date = now - timedelta(days=7)
    elif period == 'monthly':
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365) # Default/All time fall back

    
    # Line chart: Income vs Expenses over time
    line_chart_labels = []
    line_chart_income = []
    line_chart_expense = []

    if period == 'monthly':
        # Monthly view: Aggregate by Month (Last 12 months)
        # Label: Jan 26, Feb 26
        # Start date: 1 year ago
        start_date = now.replace(day=1) - timedelta(days=365)
        # Adjust to start of that month
        start_date = start_date.replace(day=1)
        
        # Initialize buckets (Month keys)
        monthly_data = {}
        # Generate last 13 months keys to cover range
        curr = start_date
        while curr <= now:
            key = curr.strftime('%b %y')
            monthly_data[key] = {'income': 0, 'expense': 0, 'sort_key': curr}
            # Add a month roughly
            next_month = curr.replace(day=28) + timedelta(days=4)
            curr = next_month.replace(day=1)

        transactions = Transaction.query.filter(Transaction.date >= start_date).all()
        for t in transactions:
            key = t.date.strftime('%b %y')
            if key in monthly_data:
                monthly_data[key][t.type] += t.amount
        
        # Sort by date
        sorted_keys = sorted(monthly_data.keys(), key=lambda k: monthly_data[k]['sort_key'])
        line_chart_labels = sorted_keys
        line_chart_income = [monthly_data[k]['income'] for k in sorted_keys]
        line_chart_expense = [monthly_data[k]['expense'] for k in sorted_keys]
        
    elif period == 'weekly':
        # Weekly view: Aggregate by Week (Last ~12 weeks)
        # Label: dd/mm/yy - dd/mm/yy
        start_date = now - timedelta(weeks=12)
        start_date = start_date - timedelta(days=start_date.weekday()) # Start on Monday
        
        weekly_data = {}
        # Generate weeks
        curr = start_date
        while curr <= now:
            week_end = curr + timedelta(days=6)
            label = f"{curr.strftime('%d/%m/%y')} - {week_end.strftime('%d/%m/%y')}"
            weekly_data[label] = {'income': 0, 'expense': 0, 'sort_key': curr}
            curr += timedelta(weeks=1)

        transactions = Transaction.query.filter(Transaction.date >= start_date).all()
        for t in transactions:
            # Find which week this belongs to
            t_date = t.date
            # Start of week for this transaction
            t_start = t_date - timedelta(days=t_date.weekday())
            t_end = t_start + timedelta(days=6)
            label = f"{t_start.strftime('%d/%m/%y')} - {t_end.strftime('%d/%m/%y')}"
            
            if label in weekly_data:
                weekly_data[label][t.type] += t.amount
        
        sorted_keys = sorted(weekly_data.keys(), key=lambda k: weekly_data[k]['sort_key'])
        line_chart_labels = sorted_keys
        line_chart_income = [weekly_data[k]['income'] for k in sorted_keys]
        line_chart_expense = [weekly_data[k]['expense'] for k in sorted_keys]

    else:
        # Daily View: Last 30 days
        # Label: dd/mm/yy
        start_date = now - timedelta(days=30)
        
        daily_data = {}
        for i in range(31):
            d = start_date + timedelta(days=i)
            label = d.strftime('%d/%m/%y')
            daily_data[label] = {'income': 0, 'expense': 0, 'sort_key': d}

        transactions = Transaction.query.filter(Transaction.date >= start_date).all()
        for t in transactions:
            label = t.date.strftime('%d/%m/%y')
            if label in daily_data:
                daily_data[label][t.type] += t.amount
                
        sorted_keys = sorted(daily_data.keys(), key=lambda k: daily_data[k]['sort_key'])
        line_chart_labels = sorted_keys
        line_chart_income = [daily_data[k]['income'] for k in sorted_keys]
        line_chart_expense = [daily_data[k]['expense'] for k in sorted_keys]

    # Recalculate totals based on the filtered transactions for consistency effectively?
    # User asked for dashboard summary. Usually summary is "Current Month" or "Total"? 
    # The previous code filtered transactions based on start_date of the VIEW. 
    # Let's keep that consistency.
    
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expenses = sum(t.amount for t in transactions if t.type == 'expense')
    balance = total_income - total_expenses
    
    # Bar chart based on these transactions
    cat_expenses = {}
    for t in transactions:
        if t.type == 'expense':
            cat_name = t.category.name
            cat_expenses[cat_name] = cat_expenses.get(cat_name, 0) + t.amount

    return jsonify({
        'summary': {
            'income': total_income,
            'expenses': total_expenses,
            'balance': balance
        },
        'bar_chart': {
            'labels': list(cat_expenses.keys()),
            'data': list(cat_expenses.values())
        },
        'line_chart': {
            'labels': line_chart_labels,
            'income': line_chart_income,
            'expense': line_chart_expense
        }
    })
