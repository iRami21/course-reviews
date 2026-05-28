from app import create_app
from models import Review, ReviewReaction

app = create_app()
with app.app_context():
    print([(row.review_id, row.user_id, row.emoji) for row in ReviewReaction.query.all()])
    print('review counts', [(review.review_id, review.reaction_counts) for review in Review.query.order_by(Review.review_id.desc()).limit(10)])
