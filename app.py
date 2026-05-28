import os
import re

from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import (
	LoginManager,
	current_user,
	login_required,
	login_user,
	logout_user,
)
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import selectinload
from werkzeug.security import check_password_hash, generate_password_hash

from models import Course, Department, Instructor, Offer, Review, Section, Teach, User, db


def create_app():
	app = Flask(__name__, static_folder="static", template_folder="templates")
	app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev")

	db_path = os.path.join(app.root_path, "12354.db")
	app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
	app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

	db.init_app(app)

	login_manager = LoginManager()
	login_manager.login_view = "login"
	login_manager.init_app(app)

	@login_manager.unauthorized_handler
	def handle_unauthorized():
		if request.path.startswith("/api/"):
			return jsonify({"error": "Authentication required."}), 401
		return redirect(url_for("login", next=request.path))

	@login_manager.user_loader
	def load_user(user_id):
		try:
			return db.session.get(User, int(user_id))
		except (TypeError, ValueError):
			return None

	@app.route("/")
	def index():
		return render_template("index.html")

	def serialize_user(user):
		return {
			"id": user.id,
			"username": user.username,
			"email": user.email,
			"avatarAnimal": user.avatar_animal,
			"gender": user.gender,
		}

	def serialize_course(course, review_stats=None):
		review_count = 0
		average_rating = 0
		if review_stats is not None:
			review_count, average_rating = review_stats.get(course.id, (0, 0))
		else:
			reviews = reviews_for_course(course.id).all()
			ratings = [review.rating for review in reviews if review.rating]
			review_count = len(reviews)
			average_rating = sum(ratings) / len(ratings) if ratings else 0

		return {
			"id": course.id,
			"code": course.code,
			"title": course.title,
			"titleZh": course.title_zh,
			"professor": course.professor or "TBD",
			"department": course.department or "TBD",
			"credits": course.credits or 0,
			"rating": round(float(average_rating or 0), 1),
			"reviewCount": int(review_count or 0),
			"followed": False,
			"saveCount": 0,
			"year": course.year,
			"semester": course.semester,
			"tags": [tag for tag in [course.department, course.course_type] if tag],
			"description": course.description or "",
		}

	def build_search_pattern(term):
		cleaned = term.strip()
		if not cleaned:
			return None
		if len(cleaned) == 1:
			return f"{cleaned}%"
		return f"%{cleaned}%"

	def course_query_with_details():
		return Course.query.options(
			selectinload(Course.offers).selectinload(Offer.department),
			selectinload(Course.sections)
			.selectinload(Section.teaches)
			.selectinload(Teach.instructor),
		)

	def course_review_stats(course_ids=None):
		query = (
			db.session.query(
				Section.course_id,
				func.count(Review.review_id),
				func.avg(Review.rating),
			)
			.join(Review, Review.section_id == Section.section_id)
			.filter(Review.parent_id.is_(None))
		)
		if course_ids:
			query = query.filter(Section.course_id.in_(course_ids))
		rows = query.group_by(Section.course_id).all()
		return {course_id: (count, average or 0) for course_id, count, average in rows}

	def review_stats_subquery():
		return (
			db.session.query(
				Section.course_id.label("course_id"),
				func.count(Review.review_id).label("review_count"),
				func.avg(Review.rating).label("average_rating"),
			)
			.join(Review, Review.section_id == Section.section_id)
			.filter(Review.parent_id.is_(None))
			.group_by(Section.course_id)
			.subquery()
		)

	def latest_section_subquery():
		return (
			db.session.query(
				Section.course_id.label("course_id"),
				func.max(Section.roc_year * 10 + Section.term).label("latest_key"),
			)
			.group_by(Section.course_id)
			.subquery()
		)

	def reviews_for_course(course_id):
		return (
			Review.query.join(Section)
			.filter(Section.course_id == course_id, Review.parent_id.is_(None))
			.order_by(Review.created_at.desc())
		)

	@app.route("/courses")
	def courses():
		query = request.args.get("q", "").strip()
		courses_query = Course.query
		if query:
			tokens = [token for token in re.split(r"\s+", query) if token]
			filters = []
			text_terms = []

			for token in tokens:
				lower = token.lower()
				if lower.isdigit() and len(lower) in {3, 4}:
					year = int(lower)
					if len(lower) == 4:
						year -= 1911
					filters.append(Course.sections.any(Section.roc_year == year))
					continue

				if lower in {"s1", "sem1", "semester1", "semester-1", "semester_1"}:
					filters.append(Course.sections.any(Section.term == 1))
					continue
				if lower in {"s2", "sem2", "semester2", "semester-2", "semester_2"}:
					filters.append(Course.sections.any(Section.term == 2))
					continue

				text_terms.append(token)

			for term in text_terms:
				pattern = build_search_pattern(term)
				if pattern is None:
					continue
				filters.append(
					or_(
						Course.name.ilike(pattern),
						Course.code.ilike(pattern),
						Course.offers.any(
							Offer.department.has(Department.name.ilike(pattern))
						),
						Course.sections.any(
							Section.teaches.any(
								Teach.instructor.has(Instructor.name.ilike(pattern))
							)
						),
					)
				)

			if filters:
				courses_query = courses_query.filter(and_(*filters))

		courses_list = courses_query.order_by(Course.code).limit(300).all()
		return render_template("courses.html", courses=courses_list, q=query)

	@app.route("/api/courses")
	def api_courses():
		query = request.args.get("q", "").strip()
		department = request.args.get("department", "").strip()
		year = request.args.get("year", "").strip()
		semester = request.args.get("semester", "").strip()
		sort_by = request.args.get("sort", "popular").strip()
		min_rating_raw = request.args.get("min_rating", "").strip()
		page = max(request.args.get("page", 1, type=int), 1)
		per_page = request.args.get("per_page", 20, type=int)
		per_page = min(max(per_page, 1), 50)

		courses_query = course_query_with_details()
		if query:
			pattern = build_search_pattern(query)
			if pattern is not None:
				courses_query = courses_query.filter(
					or_(
						Course.name.ilike(pattern),
						Course.code.ilike(pattern),
						Course.offers.any(Offer.department.has(Department.name.ilike(pattern))),
						Course.sections.any(
							Section.teaches.any(
								Teach.instructor.has(Instructor.name.ilike(pattern))
							)
						),
					)
				)

		if department:
			courses_query = courses_query.filter(
				Course.offers.any(Offer.department.has(Department.name == department))
			)
		if year:
			try:
				courses_query = courses_query.filter(
					Course.sections.any(Section.roc_year == int(year))
				)
			except ValueError:
				return jsonify({"error": "Invalid year."}), 400
		if semester:
			try:
				courses_query = courses_query.filter(
					Course.sections.any(Section.term == int(semester))
				)
			except ValueError:
				return jsonify({"error": "Invalid semester."}), 400

		stats = review_stats_subquery()
		if min_rating_raw:
			try:
				min_rating = float(min_rating_raw)
			except ValueError:
				return jsonify({"error": "Invalid minimum rating."}), 400
			courses_query = courses_query.outerjoin(stats, stats.c.course_id == Course.course_id)
			courses_query = courses_query.filter(
				func.coalesce(stats.c.average_rating, 0) >= min_rating
			)

		total = courses_query.order_by(None).count()
		total_pages = max(1, (total + per_page - 1) // per_page)
		page = min(page, total_pages)

		if sort_by in {"popular", "rating"} and min_rating_raw:
			sort_stats = stats
		elif sort_by in {"popular", "rating"}:
			sort_stats = review_stats_subquery()
			courses_query = courses_query.outerjoin(
				sort_stats,
				sort_stats.c.course_id == Course.course_id,
			)
		else:
			sort_stats = None

		if sort_by == "latest":
			latest = latest_section_subquery()
			courses_query = courses_query.outerjoin(latest, latest.c.course_id == Course.course_id)
			courses_query = courses_query.order_by(
				func.coalesce(latest.c.latest_key, 0).desc(),
				Course.code,
			)
		elif sort_by == "rating":
			courses_query = courses_query.order_by(
				func.coalesce(sort_stats.c.average_rating, 0).desc(),
				Course.code,
			)
		elif sort_by == "popular":
			courses_query = courses_query.order_by(
				func.coalesce(sort_stats.c.review_count, 0).desc(),
				Course.code,
			)
		else:
			courses_query = courses_query.order_by(Course.code)

		courses_list = courses_query.offset((page - 1) * per_page).limit(per_page).all()
		review_stats = course_review_stats([course.id for course in courses_list])
		return jsonify(
			{
				"courses": [serialize_course(course, review_stats) for course in courses_list],
				"pagination": {
					"page": page,
					"perPage": per_page,
					"total": total,
					"totalPages": total_pages,
				},
			}
		)

	@app.route("/api/filter-options")
	def api_filter_options():
		years = [
			row[0]
			for row in db.session.query(Section.roc_year)
			.filter(Section.roc_year.isnot(None))
			.distinct()
			.order_by(Section.roc_year.desc())
			.all()
		]
		semesters = [
			row[0]
			for row in db.session.query(Section.term)
			.filter(Section.term.isnot(None))
			.distinct()
			.order_by(Section.term)
			.all()
		]
		departments = [
			row[0]
			for row in db.session.query(Department.name)
			.filter(Department.name.isnot(None), Department.name != "")
			.distinct()
			.order_by(Department.name)
			.all()
		]
		return jsonify(
			{
				"years": years,
				"semesters": semesters,
				"departments": departments,
			}
		)

	@app.route("/courses/<int:course_id>")
	def course_detail(course_id):
		course = Course.query.get_or_404(course_id)
		reviews = reviews_for_course(course_id).all()
		return render_template(
			"course_detail.html",
			course=course,
			reviews=reviews,
		)

	@app.route("/courses/<int:course_id>/review", methods=["POST"])
	@login_required
	def submit_review(course_id):
		course = Course.query.get_or_404(course_id)
		section = course.latest_section
		if not section:
			flash("This course has no section to review.")
			return redirect(url_for("course_detail", course_id=course.id))

		rating_raw = request.form.get("rating", "").strip()
		comment = request.form.get("comment", "").strip()
		language = request.form.get("language", "English").strip() or "English"

		try:
			rating = int(rating_raw)
		except ValueError:
			flash("Rating must be a number between 1 and 5.")
			return redirect(url_for("course_detail", course_id=course.id))

		if rating < 1 or rating > 5:
			flash("Rating must be between 1 and 5.")
			return redirect(url_for("course_detail", course_id=course.id))

		if not comment:
			flash("Review text is required.")
			return redirect(url_for("course_detail", course_id=course.id))

		review = Review(
			section_id=section.section_id,
			user_id=current_user.id,
			rating=rating,
			text=comment,
		)
		db.session.add(review)
		db.session.commit()
		flash("Review submitted.")
		return redirect(url_for("course_detail", course_id=course.id))

	@app.route("/register", methods=["GET", "POST"])
	def register():
		if request.method == "POST":
			username = request.form.get("username", "").strip()
			email = request.form.get("email", "").strip().lower()
			password = request.form.get("password", "")

			if not username or not email or not password:
				flash("All fields are required.")
				return render_template("register.html"), 400

			if User.query.filter_by(username=username).first():
				flash("Username already exists.")
				return render_template("register.html"), 400

			if User.query.filter_by(email=email).first():
				flash("Email already registered.")
				return render_template("register.html"), 400

			user = User(
				username=username,
				email=email,
				password_hash=generate_password_hash(password),
			)
			db.session.add(user)
			db.session.commit()
			flash("Account created. Please log in.")
			return redirect(url_for("login"))

		return render_template("register.html")

	@app.route("/api/register", methods=["POST"])
	def api_register():
		data = request.get_json(silent=True) or request.form
		username = str(data.get("username", "")).strip()
		email = str(data.get("email", "")).strip().lower()
		password = str(data.get("password", ""))
		avatar_animal = str(data.get("avatarAnimal", "question")).strip()
		gender = str(data.get("gender", "undisclosed")).strip()

		if not username or not email or not password:
			return jsonify({"error": "All fields are required."}), 400

		if User.query.filter_by(username=username).first():
			return jsonify({"error": "Username already exists."}), 400

		if User.query.filter_by(email=email).first():
			return jsonify({"error": "Email already registered."}), 400

		user = User(
			username=username,
			email=email,
			password_hash=generate_password_hash(password),
			avatar_animal=avatar_animal or "question",
			gender=gender or "undisclosed",
		)
		db.session.add(user)
		db.session.commit()
		return jsonify({"user": serialize_user(user)}), 201

	@app.route("/login", methods=["GET", "POST"])
	def login():
		if request.method == "POST":
			email = request.form.get("email", "").strip().lower()
			password = request.form.get("password", "")
			user = User.query.filter_by(email=email).first()

			if not user or not check_password_hash(user.password_hash, password):
				flash("Invalid email or password.")
				return render_template("login.html"), 401

			login_user(user)
			next_url = request.form.get("next") or request.args.get("next")
			if next_url and next_url.startswith("/"):
				return redirect(next_url)
			return redirect(url_for("index"))

		return render_template("login.html")

	@app.route("/api/login", methods=["POST"])
	def api_login():
		data = request.get_json(silent=True) or request.form
		email = str(data.get("email", "")).strip().lower()
		identifier = str(data.get("identifier", "")).strip()
		password = str(data.get("password", ""))

		user = None
		if email:
			user = User.query.filter_by(email=email).first()
		elif identifier:
			if "@" in identifier:
				user = User.query.filter_by(email=identifier.lower()).first()
			else:
				user = User.query.filter_by(username=identifier).first()

		if not user or not check_password_hash(user.password_hash, password):
			return jsonify({"error": "Invalid email or password."}), 401

		login_user(user)
		return jsonify({"user": serialize_user(user)})

	@app.route("/api/session")
	def api_session():
		if not current_user.is_authenticated:
			return jsonify({"authenticated": False, "user": None})
		return jsonify({"authenticated": True, "user": serialize_user(current_user)})

	@app.route("/logout")
	@login_required
	def logout():
		logout_user()
		return redirect(url_for("login"))

	@app.route("/api/logout", methods=["POST"])
	@login_required
	def api_logout():
		logout_user()
		return jsonify({"ok": True})

	@app.route("/api/profile", methods=["PATCH"])
	@login_required
	def api_profile():
		data = request.get_json(silent=True) or {}
		username = str(data.get("username", "")).strip()
		avatar_animal = str(data.get("avatarAnimal", "")).strip()
		gender = str(data.get("gender", "")).strip()

		if username:
			if username != current_user.username and User.query.filter_by(
				username=username
			).first():
				return jsonify({"error": "Username already exists."}), 400
			current_user.username = username

		if avatar_animal:
			current_user.avatar_animal = avatar_animal
		if gender:
			current_user.gender = gender

		db.session.commit()
		return jsonify({"user": serialize_user(current_user)})

	@app.route("/profile")
	@login_required
	def profile():
		return render_template("profile.html")

	@app.cli.command("init-db")
	def init_db():
		with app.app_context():
			db.create_all()
		print(f"Initialized database at {db_path}")

	@app.cli.command("seed-nsysu")
	def seed_nsysu():
		print("12354.db already contains the normalized NSYSU course data.")
		print("Run `flask init-db` only if you need Flask to create missing tables.")

	return app


if __name__ == "__main__":
	create_app().run(debug=True)
