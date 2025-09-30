import os, json
from flask import Flask, render_template, request, redirect, url_for, session, flash
from models import db, Product, Category
from slugify import slugify

def create_app(test_config=None):
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///medicare.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.secret_key = os.environ.get('SECRET_KEY','dev_secret_key')
    db.init_app(app)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        categories = Category.query.limit(8).all()
        products = Product.query.limit(24).all()
        return render_template('index.html', categories=categories, products=products)

    @app.route('/category/<slug>')
    def category(slug):
        cat = Category.query.filter_by(slug=slug).first_or_404()
        products = Product.query.filter_by(category=cat).all()
        return render_template('category.html', category=cat, products=products)

    @app.route('/product/<slug>')
    def product(slug):
        p = Product.query.filter_by(slug=slug).first_or_404()
        images = json.loads(p.images) if p.images else []
        return render_template('product.html', product=p, images=images)

    @app.route('/search')
    def search():
        q = request.args.get('q','').strip()
        products = []
        if q:
            products = Product.query.filter(Product.name.ilike(f'%{q}%')).all()
        return render_template('search.html', q=q, products=products)

    # Cart stored in session
    def _get_cart():
        return session.setdefault('cart', {})

    @app.route('/cart')
    def cart():
        cart = _get_cart()
        items = []
        total = 0
        for pid, qty in cart.items():
            p = Product.query.get(int(pid))
            if p:
                items.append({'product': p, 'qty': qty, 'subtotal': (p.price or 0)*qty})
                total += (p.price or 0)*qty
        return render_template('cart.html', items=items, total=total)

    @app.route('/cart/add/<int:product_id>', methods=['POST'])
    def cart_add(product_id):
        cart = _get_cart()
        qty = int(request.form.get('qty', 1))
        cart[str(product_id)] = cart.get(str(product_id), 0) + qty
        session['cart'] = cart
        flash('Đã thêm vào giỏ hàng.')
        return redirect(request.referrer or url_for('index'))

    @app.route('/cart/remove/<int:product_id>', methods=['POST'])
    def cart_remove(product_id):
        cart = _get_cart()
        cart.pop(str(product_id), None)
        session['cart'] = cart
        return redirect(url_for('cart'))

    # Simple admin import page (upload JSON from scraper)
    @app.route('/admin/import', methods=['GET','POST'])
    def admin_import():
        if request.method == 'POST':
            file = request.files.get('file')
            if not file:
                flash('Chưa chọn file.')
                return redirect(url_for('admin_import'))
            data = json.load(file)
            # data is list of products
            for item in data:
                cat_name = item.get('category') or 'Khác'
                cat_slug = slugify(cat_name)
                cat = Category.query.filter_by(slug=cat_slug).first()
                if not cat:
                    cat = Category(name=cat_name, slug=cat_slug)
                    db.session.add(cat)
                    db.session.commit()
                slug = slugify(item.get('name') or 'product')
                p = Product(
                    external_id = item.get('external_id'),
                    name = item.get('name'),
                    slug = slug,
                    brand = item.get('brand'),
                    price = float(item.get('price') or 0),
                    old_price = float(item.get('old_price') or 0) if item.get('old_price') else None,
                    unit = item.get('unit'),
                    stock = int(item.get('stock') or 0),
                    description = item.get('description'),
                    images = json.dumps(item.get('images') or []),
                    category = cat
                )
                db.session.add(p)
            db.session.commit()
            flash('Import hoàn tất.')
            return redirect(url_for('index'))
        return render_template('admin_import.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
