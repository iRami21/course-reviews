# -*- coding: utf-8 -*-
from app import create_app
from models import Course, Review, ReviewReaction, User, db

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='persist_test@example.com').first()
    if not user:
        user = User(username='persist_test', email='persist_test@example.com', password_hash='not_used', role='student')
        db.session.add(user)
        db.session.commit()

    course = Course.query.first()
    if not course:
        raise SystemExit('No course available')

    root_review = Review.query.filter_by(parent_id=None).order_by(Review.review_id.desc()).first()
    if not root_review:
        root_review = Review(
            section_id=course.latest_section.section_id,
            user_id=user.id,
            rating=5,
            text='reaction baseline'
        )
        db.session.add(root_review)
        db.session.commit()

    with app.test_client() as client:
        with client.session_transaction() as session:
            session['_user_id'] = str(user.id)
            session['_fresh'] = True

        reaction_response = client.post(
            f'/api/courses/{course.id}/reviews/{root_review.review_id}/reactions',
            json={'reaction': '😮'}
        )
        print('REACTION_STATUS', reaction_response.status_code)
        print('REACTION_JSON', reaction_response.get_json())

        get_response = client.get(f'/api/courses/{course.id}/reviews')
        payload = get_response.get_json()
        data = next(item for item in payload['reviews'] if item['id'] == root_review.review_id)
        print('SERIALIZED_REACTION', data['reaction'])
        print('SERIALIZED_LIKES', data['likes'])
        print('SERIALIZED_COUNTS', data['reactionCounts'])

        row = ReviewReaction.query.filter_by(review_id=root_review.review_id, user_id=user.id).first()
        print('ROW', row.emoji if row else None)
