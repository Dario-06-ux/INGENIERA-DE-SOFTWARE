// app.py – Flask backend for InventoryPro
import os
import sqlite3
# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, redirect, url_for, session, g, flash

app = Flask(__name__)
app.secret_key = os.urandom(24)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "inventario.db")

# ---------- Database utilities ----------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    # Crear tablas si no existen
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            contacto TEXT
        );
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            stock INTEGER NOT NULL,
            precio REAL NOT NULL,
            categoria_id INTEGER,
            proveedor_id INTEGER,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id),
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        );
        """
    )
    # Si no hay usuarios, crear el usuario de prueba
    cur = db.execute("SELECT COUNT(*) as cnt FROM usuarios")
    if cur.fetchone()["cnt"] == 0:
        db.execute(
            "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?,?)",
            ("Test User", "test@example.com", "123456", "admin"),
        )
    db.commit()
    # -------------------------------------------------
    # Seed data: create sample categories, proveedores, productos if empty
    # -------------------------------------------------
    # Categories
    cur = db.execute('SELECT COUNT(*) as cnt FROM categorias')
    if cur.fetchone()['cnt'] == 0:
        sample_categories = ['Ropa', 'Electrónica', 'Hogar', 'Juguetes', 'Papelería']
        for name in sample_categories:
            db.execute('INSERT INTO categorias (nombre) VALUES (?)', (name,))
    # Proveedores
    cur = db.execute('SELECT COUNT(*) as cnt FROM proveedores')
    if cur.fetchone()['cnt'] == 0:
        sample_proveedores = [
            ('Proveedor A', 'contactoA@example.com'),
            ('Proveedor B', 'contactoB@example.com'),
            ('Proveedor C', 'contactoC@example.com'),
        ]
        for nombre, contacto in sample_proveedores:
            db.execute('INSERT INTO proveedores (nombre, contacto) VALUES (?, ?)', (nombre, contacto))
    # Productos
    cur = db.execute('SELECT COUNT(*) as cnt FROM productos')
    if cur.fetchone()['cnt'] == 0:
        # Map category and provider names to ids
        cat_map = {row['nombre']: row['id'] for row in db.execute('SELECT id, nombre FROM categorias')}
        prov_map = {row['nombre']: row['id'] for row in db.execute('SELECT id, nombre FROM proveedores')}
        sample_products = [
            ('Camisa', 120, 19.99, cat_map.get('Ropa'), prov_map.get('Proveedor A')),
            ('Laptop', 45, 799.99, cat_map.get('Electrónica'), prov_map.get('Proveedor B')),
            ('Silla', 80, 49.99, cat_map.get('Hogar'), prov_map.get('Proveedor C')),
            ('Muñeco', 30, 15.50, cat_map.get('Juguetes'), prov_map.get('Proveedor A')),
            ('Cuaderno', 200, 3.75, cat_map.get('Papelería'), prov_map.get('Proveedor B')),
        ]
        for nombre, stock, precio, cat_id, prov_id in sample_products:
            db.execute(
                'INSERT INTO productos (nombre, stock, precio, categoria_id, proveedor_id) VALUES (?,?,?,?,?)',
                (nombre, stock, precio, cat_id, prov_id)
            )
    db.commit()

# ---------- Helper ----------

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

# ---------- Routes ----------

@app.route("/", methods=["GET", "POST"])
def login():
    init_db()
    if request.method == "POST":
        email = request.form["email"].strip()
        password = request.form["password"].strip()
        db = get_db()
        user = db.execute(
            "SELECT * FROM usuarios WHERE email = ? AND password = ?",
            (email, password),
        ).fetchone()
        if user:
            session["user_id"] = user["id"]
            session["user_name"] = user["nombre"]
            return redirect(url_for("dashboard"))
        flash("Credenciales incorrectas", "error")
    return render_template("login.html")

@app.route("/dashboard")
@login_required
def dashboard():
    db = get_db()
    total_productos = db.execute("SELECT COUNT(*) as cnt FROM productos").fetchone()["cnt"]
    total_categorias = db.execute("SELECT COUNT(*) as cnt FROM categorias").fetchone()["cnt"]
    total_proveedores = db.execute("SELECT COUNT(*) as cnt FROM proveedores").fetchone()["cnt"]
    total_usuarios = db.execute("SELECT COUNT(*) as cnt FROM usuarios").fetchone()["cnt"]
    stock_disponible = db.execute("SELECT COALESCE(SUM(stock),0) as sum FROM productos").fetchone()["sum"]
    stock_bajo = db.execute("SELECT COUNT(*) as cnt FROM productos WHERE stock <= 7").fetchone()["cnt"]
    # Datos para gráficos (ejemplo sencillo)
    categorias = db.execute(
        "SELECT c.nombre, COALESCE(SUM(p.stock),0) as stock FROM categorias c "
        "LEFT JOIN productos p ON p.categoria_id = c.id GROUP BY c.id"
    ).fetchall()
    # Convertir a listas para plantilla
    cat_labels = [c["nombre"] for c in categorias]
    cat_values = [c["stock"] for c in categorias]
    return render_template(
        "dashboard.html",
        productos=total_productos,
        categorias=total_categorias,
        proveedores=total_proveedores,
        usuarios=total_usuarios,
        stock_disp=stock_disponible,
        stock_bajo=stock_bajo,
        cat_labels=cat_labels,
        cat_values=cat_values,
    )

# ---------- CRUD: Productos ----------
@app.route("/productos")
@login_required
def productos():
    db = get_db()
    lista = db.execute(
        "SELECT p.*, c.nombre as cat_nombre, prov.nombre as prov_nombre "
        "FROM productos p "
        "LEFT JOIN categorias c ON p.categoria_id = c.id "
        "LEFT JOIN proveedores prov ON p.proveedor_id = prov.id"
    ).fetchall()
    categorias = db.execute("SELECT * FROM categorias").fetchall()
    proveedores = db.execute("SELECT * FROM proveedores").fetchall()
    return render_template("productos.html", productos=lista, categorias=categorias, proveedores=proveedores)

@app.route("/productos/crear", methods=["POST"])
@login_required
def crear_producto():
    db = get_db()
    db.execute(
        "INSERT INTO productos (nombre, stock, precio, categoria_id, proveedor_id) VALUES (?,?,?,?,?)",
        (
            request.form["nombre"],
            int(request.form["stock"]),
            float(request.form["precio"]),
            int(request.form["categoria_id"]),
            int(request.form["proveedor_id"]),
        ),
    )
    db.commit()
    return redirect(url_for("productos"))

@app.route("/productos/editar/<int:id>", methods=["GET", "POST"])
@login_required
def editar_producto(id):
    db = get_db()
    if request.method == "POST":
        db.execute(
            "UPDATE productos SET nombre=?, stock=?, precio=?, categoria_id=?, proveedor_id=? WHERE id=?",
            (
                request.form["nombre"],
                int(request.form["stock"]),
                float(request.form["precio"]),
                int(request.form["categoria_id"]),
                int(request.form["proveedor_id"]),
                id,
            ),
        )
        db.commit()
        return redirect(url_for("productos"))
    prod = db.execute("SELECT * FROM productos WHERE id=?", (id,)).fetchone()
    categorias = db.execute("SELECT * FROM categorias").fetchall()
    proveedores = db.execute("SELECT * FROM proveedores").fetchall()
    return render_template("productos.html", edit_producto=prod, categorias=categorias, proveedores=proveedores)

@app.route("/productos/borrar/<int:id>", methods=["POST"])
@login_required
def borrar_producto(id):
    db = get_db()
    db.execute("DELETE FROM productos WHERE id=?", (id,))
    db.commit()
    return redirect(url_for("productos"))

# ---------- CRUD: Categorías ----------
@app.route("/categorias")
@login_required
def categorias():
    db = get_db()
    lista = db.execute("SELECT * FROM categorias").fetchall()
    return render_template("categorias.html", categorias=lista)

@app.route("/categorias/crear", methods=["POST"])
@login_required
def crear_categoria():
    db = get_db()
    db.execute("INSERT INTO categorias (nombre) VALUES (?)", (request.form["nombre"],))
    db.commit()
    return redirect(url_for("categorias"))

@app.route("/categorias/editar/<int:id>", methods=["GET", "POST"])
@login_required
def editar_categoria(id):
    db = get_db()
    if request.method == "POST":
        db.execute("UPDATE categorias SET nombre=? WHERE id=?", (request.form["nombre"], id))
        db.commit()
        return redirect(url_for("categorias"))
    cat = db.execute("SELECT * FROM categorias WHERE id=?", (id,)).fetchone()
    return render_template("categorias.html", edit_categoria=cat)

@app.route("/categorias/borrar/<int:id>", methods=["POST"])
@login_required
def borrar_categoria(id):
    db = get_db()
    db.execute("DELETE FROM categorias WHERE id=?", (id,))
    db.commit()
    return redirect(url_for("categorias"))

# ---------- CRUD: Proveedores ----------
@app.route("/proveedores")
@login_required
def proveedores():
    db = get_db()
    lista = db.execute("SELECT * FROM proveedores").fetchall()
    return render_template("proveedores.html", proveedores=lista)

@app.route("/proveedores/crear", methods=["POST"])
@login_required
def crear_proveedor():
    db = get_db()
    db.execute(
        "INSERT INTO proveedores (nombre, contacto) VALUES (?,?)",
        (request.form["nombre"], request.form["contacto"]),
    )
    db.commit()
    return redirect(url_for("proveedores"))

@app.route("/proveedores/editar/<int:id>", methods=["GET", "POST"])
@login_required
def editar_proveedor(id):
    db = get_db()
    if request.method == "POST":
        db.execute(
            "UPDATE proveedores SET nombre=?, contacto=? WHERE id=?",
            (request.form["nombre"], request.form["contacto"], id),
        )
        db.commit()
        return redirect(url_for("proveedores"))
    prov = db.execute("SELECT * FROM proveedores WHERE id=?", (id,)).fetchone()
    return render_template("proveedores.html", edit_proveedor=prov)

@app.route("/proveedores/borrar/<int:id>", methods=["POST"])
@login_required
def borrar_proveedor(id):
    db = get_db()
    db.execute("DELETE FROM proveedores WHERE id=?", (id,))
    db.commit()
    return redirect(url_for("proveedores"))

if __name__ == "__main__":
    app.run(debug=True, port=5000)
