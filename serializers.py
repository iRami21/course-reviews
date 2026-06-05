from flask_login import current_user

from models import ReviewReaction
from utils.course_utils import format_grade_tag
from utils.departments import clean_professor_name


def serialize_user(user):
	return {
		"id": user.id,
		"username": user.username,
		"email": user.email,
		"avatarAnimal": user.avatar_animal,
		"gender": user.gender,
		"role": user.role or "student",
	}


def serialize_course(course, favorite_counts=None, favorite_ids=None):
	reviews = [review for review in (course.reviews or []) if review.is_visible]
	average_rating = (
		sum(review.rating for review in reviews) / len(reviews)
		if reviews
		else 0
	)
	grade_tag = format_grade_tag(course.grade)
	professor_name = clean_professor_name(course.professor)
	return {
		"id": course.id,
		"code": course.code,
		"title": course.title,
		"titleZh": course.title_zh or "",
		"professor": professor_name,
		"department": course.department or "General",
		"credits": course.credits or 0,
		"grade": course.grade or "",
		"requirement": course.requirement or "",
		"englishTaught": bool(course.english_taught),
		"rating": round(average_rating, 1),
		"reviewCount": len(reviews),
		"followed": course.id in (favorite_ids or set()),
		"saveCount": (favorite_counts or {}).get(course.id, 0),
		"year": course.year or 0,
		"semester": course.semester or 0,
		"tags": [
			tag
			for tag in [
				course.department,
				f"{course.year} S{course.semester}"
				if course.year and course.semester
				else None,
				grade_tag,
				course.requirement,
				"全英授課" if course.english_taught else None,
			]
			if tag
		],
		"description": course.description or "No description available.",
	}


def summarize_reactions(reactions):
	counts = {}
	for reaction in reactions or []:
		if not reaction.reaction:
			continue
		counts[reaction.reaction] = counts.get(reaction.reaction, 0) + 1
	return [
		{"reaction": reaction, "count": count}
		for reaction, count in sorted(
			counts.items(),
			key=lambda item: (-item[1], item[0]),
		)
	]


def serialize_review(review):
	author = review.author
	current_reaction = None
	if current_user.is_authenticated:
		current_reaction = ReviewReaction.query.filter_by(
			user_id=current_user.id,
			review_id=review.id,
			reply_id=None,
		).first()
	return {
		"id": str(review.id),
		"author": author.username if author else "Anonymous",
		"avatar": {
			"avatarAnimal": author.avatar_animal if author else "question",
			"gender": author.gender if author else "undisclosed",
		},
		"rating": review.rating,
		"date": review.created_at.strftime("%Y-%m-%d"),
		"language": review.language or "English",
		"text": review.text,
		"likes": len(review.reactions or []),
		"liked": current_reaction is not None,
		"reaction": current_reaction.reaction if current_reaction else "",
		"reactionSummary": summarize_reactions(review.reactions),
		"replies": [
			serialize_reply(reply)
			for reply in (review.replies or [])
			if reply.is_visible
		],
	}


def serialize_reply(reply):
	author = reply.author
	current_reaction = None
	if current_user.is_authenticated:
		current_reaction = ReviewReaction.query.filter_by(
			user_id=current_user.id,
			review_id=None,
			reply_id=reply.id,
		).first()
	return {
		"id": str(reply.id),
		"author": author.username if author else "Anonymous",
		"avatar": {
			"avatarAnimal": author.avatar_animal if author else "question",
			"gender": author.gender if author else "undisclosed",
		},
		"date": reply.created_at.strftime("%Y-%m-%d"),
		"text": reply.text,
		"likes": len(reply.reactions or []),
		"liked": current_reaction is not None,
		"reaction": current_reaction.reaction if current_reaction else "",
		"reactionSummary": summarize_reactions(reply.reactions),
		"replies": [],
	}


def serialize_notification(notification):
	return {
		"id": str(notification.id),
		"message": notification.message,
		"link": notification.link or "",
		"category": notification.category,
		"isRead": notification.is_read,
		"createdAt": notification.created_at.strftime("%Y-%m-%d %H:%M"),
	}
